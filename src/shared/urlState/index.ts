import type {
  AppTheme,
  SyncParams,
  TimerEndBehavior,
  TimerSequenceRow,
} from "../liveSession/types.ts"
import {
  DEFAULT_SYNC_PARAMS,
  MAX_TIMER_DURATION_SECONDS,
  MAX_TITLE_LENGTH,
  normalizeOptionalColor,
  normalizeTheme,
  normalizeTitle,
} from "../security/input.ts"
import {
  normalizeTimerFinishedSoundId,
  normalizeTimerTtsMode,
  type TtsMode,
} from "../timerSettings.ts"
import {
  buildDurationPartsFromTotalSeconds,
  buildDefaultTimerSequenceRow,
  clampTimerSequenceIndex,
} from "../timerSequence.ts"

export function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binStr = ""
  for (const byte of bytes) {
    binStr += String.fromCharCode(byte)
  }
  return btoa(binStr).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function decodeBase64Url(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  const binStr = atob(base64)
  const bytes = new Uint8Array(binStr.length)
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

export const TIMER_URL_VERSION = "1"
export const URL_LENGTH_WARN_CHARS = 4096

export type UrlTimerRow = TimerSequenceRow

export type ParsedTimerUrlState = {
  activeIndex: number
  theme: AppTheme
  hasTimerState: boolean
  rows: UrlTimerRow[]
  snd: SyncParams["snd"]
  tts: TtsMode
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

  if (parts.length !== 5) {
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
  const theme = normalizeTheme(searchParams.get("theme"))
  const snd = normalizeTimerFinishedSoundId(
    searchParams.get("s"),
    DEFAULT_SYNC_PARAMS.snd,
  )
  const tts = normalizeTimerTtsMode(
    searchParams.get("ts"),
    DEFAULT_SYNC_PARAMS.tts,
  )

  if (!allowTimerState) {
    return {
      activeIndex: 0,
      theme,
      hasTimerState: false,
      rows: [],
      snd,
      tts,
      version: null,
    }
  }
  const version = searchParams.get("v")
  const encodedT = searchParams.get("t")

  if (version !== TIMER_URL_VERSION || !encodedT) {
    return {
      activeIndex: 0,
      theme,
      hasTimerState: false,
      rows: [],
      snd,
      tts,
      version,
    }
  }

  let rowsValue: string
  try {
    rowsValue = decodeBase64Url(encodedT)
  } catch {
    return {
      activeIndex: 0,
      theme,
      hasTimerState: false,
      rows: [],
      snd,
      tts,
      version,
    }
  }

  const rows = rowsValue
    .split("|")
    .map(parseTimerUrlRow)
    .filter((row): row is UrlTimerRow => row !== null)

  return {
    activeIndex: parseUrlActiveIndex(searchParams.get("a"), rows.length),
    theme,
    hasTimerState: rows.length > 0,
    rows,
    snd,
    tts,
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
      theme: state.theme,
      snd: state.snd,
      tts: state.tts,
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
    theme: state.theme,
    m: duration.m,
    pc: activeRow.primaryColor || fallback.pc,
    rows: state.rows.map(buildUrlTimerRow),
    s: duration.s,
    snd: state.snd,
    tts: state.tts,
    title: activeRow.title,
  }
}

export const projectFirstUrlTimerRowToSyncParams =
  projectTimerUrlStateToSyncParams

export const syncParamsMatchParsedTimerUrlState = ({
  params,
  state,
}: {
  params: Pick<SyncParams, "activeIndex" | "theme" | "rows" | "snd" | "tts">
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
    params.theme === projectedParams.theme &&
    params.snd === projectedParams.snd &&
    params.tts === projectedParams.tts &&
    params.activeIndex === projectedParams.activeIndex &&
    JSON.stringify(params.rows) === JSON.stringify(projectedParams.rows)
  )
}

export const serializeUrlTimerRow = (row: UrlTimerRow) => {
  const normalizedRow = buildUrlTimerRow(row)

  return [
    normalizedRow.totalSeconds.toString(),
    normalizedRow.primaryColor.replace(/^#/, ""),
    encodeURIComponent(normalizedRow.title).replace(/!/g, "%21"),
    normalizedRow.repeatCount.toString(),
    serializeUrlEndBehavior(normalizedRow.endBehavior),
  ].join("!")
}

export const buildTimerUrlSearchParams = ({
  activeIndex = 0,
  theme,
  extraParams = {},
  rows,
  snd = DEFAULT_SYNC_PARAMS.snd,
  tts = DEFAULT_SYNC_PARAMS.tts,
}: {
  activeIndex?: number
  theme?: AppTheme | null
  extraParams?: Record<string, string | null | undefined>
  rows: UrlTimerRow[]
  snd?: SyncParams["snd"]
  tts?: TtsMode
}) => {
  const searchParams = new URLSearchParams()
  const normalizedTheme = normalizeTheme(theme)
  const normalizedSound = normalizeTimerFinishedSoundId(
    snd,
    DEFAULT_SYNC_PARAMS.snd,
  )
  const normalizedTts = normalizeTimerTtsMode(tts, DEFAULT_SYNC_PARAMS.tts)
  const normalizedRows = rows.map(buildUrlTimerRow)
  const serializedRows = normalizedRows.map(serializeUrlTimerRow).join("|")

  if (serializedRows) {
    searchParams.set("v", TIMER_URL_VERSION)
    searchParams.set("t", encodeBase64Url(serializedRows))
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

  if (normalizedTheme !== DEFAULT_SYNC_PARAMS.theme) {
    searchParams.set("theme", normalizedTheme)
  }
  if (normalizedSound !== DEFAULT_SYNC_PARAMS.snd) {
    searchParams.set("s", normalizedSound)
  }
  if (normalizedTts !== DEFAULT_SYNC_PARAMS.tts) {
    searchParams.set("ts", normalizedTts)
  }

  for (const [key, value] of Object.entries(extraParams)) {
    if (value) {
      searchParams.set(key, value)
    }
  }

  return searchParams
}
