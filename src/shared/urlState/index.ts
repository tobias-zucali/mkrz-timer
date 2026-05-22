import type {
  SyncParams,
  TimerEndBehavior,
  TimerSequenceRow,
} from "../remoteSession/types.ts"
import {
  DEFAULT_SYNC_PARAMS,
  MAX_TIMER_DURATION_SECONDS,
  MAX_TITLE_LENGTH,
  normalizeColor,
  normalizeOptionalColor,
  normalizeTitle,
} from "../security/input.ts"
import {
  buildDurationPartsFromTotalSeconds,
  buildDefaultTimerSequenceRow,
  clampTimerSequenceIndex,
} from "../timerSequence.ts"

export const TIMER_URL_VERSION = "1"
export const MAX_TIMER_URL_ROWS = 12
export const MAX_TIMER_URL_LENGTH = 2000

export type UrlTimerRow = TimerSequenceRow

export type ParsedTimerUrlState = {
  activeIndex: number
  bg: string
  fg: string
  hasTimerState: boolean
  rows: UrlTimerRow[]
  version: string | null
}

const isDigitsOnly = (value: string) => /^\d+$/.test(value)

const parseUrlEndBehavior = (value: string): TimerEndBehavior | null => {
  if (value === "0") {
    return "stop"
  }

  if (value === "1") {
    return "advance"
  }

  return null
}

const serializeUrlEndBehavior = (value: TimerEndBehavior) =>
  value === "advance" ? "1" : "0"

const parseUrlRepeatCount = (value: string) => {
  if (!isDigitsOnly(value)) {
    return null
  }

  const repeatCount = Number.parseInt(value, 10)

  return repeatCount >= 1 && repeatCount <= 99 ? repeatCount : null
}

const parseUrlActiveIndex = (value: string | null, rowCount: number) => {
  if (!value || !isDigitsOnly(value)) {
    return 0
  }

  return clampTimerSequenceIndex({
    activeIndex: Number.parseInt(value, 10),
    rows: new Array(Math.max(rowCount, 1)).fill(buildDefaultTimerSequenceRow()),
  })
}

const parseTimerUrlRow = (value: string): UrlTimerRow | null => {
  const parts = value.split("!")

  if (parts.length !== 4 && parts.length !== 5) {
    return null
  }

  const [secondsValue, colorValue, encodedTitle, fourthValue, fifthValue] =
    parts
  if (!isDigitsOnly(secondsValue)) {
    return null
  }

  const totalSeconds = Number.parseInt(secondsValue, 10)
  if (totalSeconds < 0 || totalSeconds > MAX_TIMER_DURATION_SECONDS) {
    return null
  }

  let decodedTitle = ""
  try {
    decodedTitle = decodeURIComponent(encodedTitle)
  } catch {
    return null
  }

  const primaryColor = normalizeOptionalColor(colorValue)
  if (colorValue !== "" && !primaryColor) {
    return null
  }

  if (parts.length === 4) {
    const endBehavior = parseUrlEndBehavior(fourthValue)
    if (endBehavior === null) {
      return null
    }

    return {
      endBehavior: "stop",
      primaryColor,
      repeatCount: 1,
      title: normalizeTitle(decodedTitle).slice(0, MAX_TITLE_LENGTH),
      totalSeconds,
    }
  }

  const repeatCount = parseUrlRepeatCount(fourthValue)
  const endBehavior = parseUrlEndBehavior(fifthValue ?? "")
  if (repeatCount === null || endBehavior === null) {
    return null
  }

  return {
    endBehavior,
    primaryColor,
    repeatCount,
    title: normalizeTitle(decodedTitle).slice(0, MAX_TITLE_LENGTH),
    totalSeconds,
  }
}

export const parseTimerUrlState = ({
  allowTimerState = true,
  searchParams,
}: {
  allowTimerState?: boolean
  searchParams: URLSearchParams
}): ParsedTimerUrlState => {
  if (!allowTimerState) {
    return {
      activeIndex: 0,
      bg: DEFAULT_SYNC_PARAMS.bg,
      fg: DEFAULT_SYNC_PARAMS.fg,
      hasTimerState: false,
      rows: [],
      version: null,
    }
  }

  const bg = normalizeColor(searchParams.get("bg"), DEFAULT_SYNC_PARAMS.bg)
  const fg = normalizeColor(searchParams.get("fg"), DEFAULT_SYNC_PARAMS.fg)
  const version = searchParams.get("v")
  const rowsValue = searchParams.get("t")

  if (version !== TIMER_URL_VERSION || !rowsValue) {
    return {
      activeIndex: 0,
      bg,
      fg,
      hasTimerState: false,
      rows: [],
      version,
    }
  }

  const rows = rowsValue
    .split("|")
    .slice(0, MAX_TIMER_URL_ROWS)
    .map(parseTimerUrlRow)
    .filter((row): row is UrlTimerRow => row !== null)

  return {
    activeIndex: parseUrlActiveIndex(searchParams.get("a"), rows.length),
    bg,
    fg,
    hasTimerState: rows.length > 0,
    rows,
    version,
  }
}

export const buildUrlTimerRow = ({
  endBehavior = "stop",
  primaryColor,
  repeatCount = 1,
  title,
  totalSeconds,
}: Partial<UrlTimerRow> &
  Pick<UrlTimerRow, "title" | "totalSeconds">): UrlTimerRow => ({
  endBehavior,
  primaryColor: normalizeOptionalColor(primaryColor ?? ""),
  repeatCount: Math.min(Math.max(Math.floor(repeatCount), 1), 99),
  title: normalizeTitle(title).slice(0, MAX_TITLE_LENGTH),
  totalSeconds: Math.min(
    Math.max(Math.floor(totalSeconds), 0),
    MAX_TIMER_DURATION_SECONDS,
  ),
})

export const buildUrlTimerRowFromSyncParams = (
  params: Pick<SyncParams, "m" | "pc" | "rows" | "s" | "title">,
): UrlTimerRow =>
  params.rows[0] ??
  buildUrlTimerRow({
    primaryColor: params.pc,
    title: params.title,
    totalSeconds:
      Number.parseInt(params.m, 10) * 60 + Number.parseInt(params.s, 10),
  })

export const projectTimerUrlStateToSyncParams = ({
  fallback = DEFAULT_SYNC_PARAMS,
  state,
}: {
  fallback?: SyncParams
  state: ParsedTimerUrlState
}): SyncParams => {
  if (!state.rows[0]) {
    return {
      ...fallback,
      bg: state.bg,
      fg: state.fg,
    }
  }

  const activeIndex = clampTimerSequenceIndex({
    activeIndex: state.activeIndex,
    rows: state.rows,
  })
  const activeRow = state.rows[activeIndex] ?? state.rows[0]
  const duration = buildDurationPartsFromTotalSeconds(activeRow.totalSeconds)

  return {
    activeIndex,
    bg: state.bg,
    fg: state.fg,
    m: duration.m,
    pc: activeRow.primaryColor || fallback.pc,
    rows: state.rows.map(buildUrlTimerRow),
    s: duration.s,
    title: activeRow.title,
  }
}

export const projectFirstUrlTimerRowToSyncParams =
  projectTimerUrlStateToSyncParams

export const syncParamsMatchParsedTimerUrlState = ({
  params,
  state,
}: {
  params: Pick<SyncParams, "activeIndex" | "bg" | "fg" | "rows">
  state: ParsedTimerUrlState
}) => {
  if (!state.hasTimerState) {
    return false
  }

  const projectedParams = projectTimerUrlStateToSyncParams({
    fallback: DEFAULT_SYNC_PARAMS,
    state,
  })

  return (
    params.bg === projectedParams.bg &&
    params.fg === projectedParams.fg &&
    params.activeIndex === projectedParams.activeIndex &&
    JSON.stringify(params.rows) === JSON.stringify(projectedParams.rows)
  )
}

export const serializeUrlTimerRow = (row: UrlTimerRow) => {
  const normalizedRow = buildUrlTimerRow(row)

  return [
    normalizedRow.totalSeconds.toString(),
    normalizedRow.primaryColor.replace(/^#/, ""),
    encodeURIComponent(normalizedRow.title),
    normalizedRow.repeatCount.toString(),
    serializeUrlEndBehavior(normalizedRow.endBehavior),
  ].join("!")
}

export const buildTimerUrlSearchParams = ({
  activeIndex = 0,
  bg,
  extraParams = {},
  fg,
  rows,
}: {
  activeIndex?: number
  bg?: string | null
  extraParams?: Record<string, string | null | undefined>
  fg?: string | null
  rows: UrlTimerRow[]
}) => {
  const searchParams = new URLSearchParams()
  const normalizedBg = normalizeColor(bg, DEFAULT_SYNC_PARAMS.bg)
  const normalizedFg = normalizeColor(fg, DEFAULT_SYNC_PARAMS.fg)
  const normalizedRows = rows.slice(0, MAX_TIMER_URL_ROWS).map(buildUrlTimerRow)

  let serializedRows = ""

  for (const row of normalizedRows) {
    const nextSerializedRow = serializeUrlTimerRow(row)
    const candidateRows = serializedRows
      ? `${serializedRows}|${nextSerializedRow}`
      : nextSerializedRow
    const candidateSearchParams = new URLSearchParams()

    candidateSearchParams.set("v", TIMER_URL_VERSION)
    candidateSearchParams.set("t", candidateRows)
    candidateSearchParams.set("a", activeIndex.toString())
    candidateSearchParams.set("bg", normalizedBg.replace(/^#/, ""))
    candidateSearchParams.set("fg", normalizedFg.replace(/^#/, ""))

    for (const [key, value] of Object.entries(extraParams)) {
      if (value) {
        candidateSearchParams.set(key, value)
      }
    }

    if (candidateSearchParams.toString().length >= MAX_TIMER_URL_LENGTH) {
      break
    }

    serializedRows = candidateRows
  }

  if (serializedRows) {
    searchParams.set("v", TIMER_URL_VERSION)
    searchParams.set("t", serializedRows)
    searchParams.set(
      "a",
      clampTimerSequenceIndex({
        activeIndex,
        rows:
          normalizedRows.length > 0
            ? normalizedRows
            : [buildDefaultTimerSequenceRow()],
      }).toString(),
    )
  }

  if (normalizedBg !== DEFAULT_SYNC_PARAMS.bg) {
    searchParams.set("bg", normalizedBg.replace(/^#/, ""))
  }

  if (normalizedFg !== DEFAULT_SYNC_PARAMS.fg) {
    searchParams.set("fg", normalizedFg.replace(/^#/, ""))
  }

  for (const [key, value] of Object.entries(extraParams)) {
    if (value) {
      searchParams.set(key, value)
    }
  }

  return searchParams
}
