import {
  DEFAULT_SYNC_PARAMS,
  MAX_TIMER_DURATION_SECONDS,
  MAX_TITLE_LENGTH,
  normalizeColor,
  normalizeTitle,
} from "../security/input.ts"
import type { SyncParams } from "../remoteSession/types.ts"
import {
  getMinutesSeconds,
  getSecondsDuration,
} from "../../utils/timeInputHelpers/index.ts"

export const TIMER_URL_VERSION = "1"
export const MAX_TIMER_URL_ROWS = 12
export const MAX_TIMER_URL_LENGTH = 2000

export type UrlTimerFlag = "0" | "1"

export type UrlTimerRow = {
  flag: UrlTimerFlag
  primaryColor: string
  title: string
  totalSeconds: number
}

export type ParsedTimerUrlState = {
  bg: string
  fg: string
  hasTimerState: boolean
  rows: UrlTimerRow[]
  version: string | null
}

const DEFAULT_URL_TIMER_FLAG: UrlTimerFlag = "0"

const isDigitsOnly = (value: string) => /^\d+$/.test(value)

const normalizeTimerUrlFlag = (value: string): UrlTimerFlag | null => {
  if (value === "0" || value === "1") {
    return value
  }

  return null
}

const parseTimerUrlRow = (value: string): UrlTimerRow | null => {
  const parts = value.split("!")
  if (parts.length !== 4) {
    return null
  }

  const [secondsValue, colorValue, encodedTitle, flagValue] = parts
  if (!isDigitsOnly(secondsValue)) {
    return null
  }

  const totalSeconds = Number.parseInt(secondsValue, 10)
  if (totalSeconds < 0 || totalSeconds > MAX_TIMER_DURATION_SECONDS) {
    return null
  }

  const primaryColor = normalizeColor(colorValue, "")
  if (!primaryColor) {
    return null
  }

  let decodedTitle = ""
  try {
    decodedTitle = decodeURIComponent(encodedTitle)
  } catch {
    return null
  }

  const flag = normalizeTimerUrlFlag(flagValue)
  if (flag === null) {
    return null
  }

  return {
    flag,
    // TODO: Interpret the reserved row flag once the product defines its behavior.
    primaryColor,
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
    bg,
    fg,
    hasTimerState: rows.length > 0,
    rows,
    version,
  }
}

export const buildUrlTimerRow = ({
  flag = DEFAULT_URL_TIMER_FLAG,
  primaryColor,
  title,
  totalSeconds,
}: {
  flag?: UrlTimerFlag
  primaryColor: string
  title: string
  totalSeconds: number
}): UrlTimerRow => ({
  flag,
  primaryColor: normalizeColor(primaryColor, DEFAULT_SYNC_PARAMS.pc),
  title: normalizeTitle(title).slice(0, MAX_TITLE_LENGTH),
  totalSeconds: Math.min(
    Math.max(Math.floor(totalSeconds), 0),
    MAX_TIMER_DURATION_SECONDS,
  ),
})

export const buildUrlTimerRowFromSyncParams = (
  params: Pick<SyncParams, "m" | "pc" | "s" | "title">,
): UrlTimerRow =>
  buildUrlTimerRow({
    primaryColor: params.pc,
    title: params.title,
    totalSeconds: getSecondsDuration(params.m, params.s),
  })

export const projectFirstUrlTimerRowToSyncParams = ({
  fallback = DEFAULT_SYNC_PARAMS,
  state,
}: {
  fallback?: SyncParams
  state: ParsedTimerUrlState
}): SyncParams => {
  const [firstRow] = state.rows

  if (!firstRow) {
    return {
      ...fallback,
      bg: state.bg,
      fg: state.fg,
    }
  }

  if (state.rows.length > 1) {
    // TODO: Apply parsed URL rows beyond the first once multi-row runtime support exists.
  }

  const [minutes, seconds] = getMinutesSeconds(firstRow.totalSeconds)

  return {
    bg: state.bg,
    fg: state.fg,
    m: minutes,
    pc: firstRow.primaryColor,
    s: seconds,
    title: firstRow.title,
  }
}

export const syncParamsMatchParsedTimerUrlState = ({
  params,
  state,
}: {
  params: Pick<SyncParams, "bg" | "fg" | "m" | "pc" | "s" | "title">
  state: ParsedTimerUrlState
}) => {
  if (!state.hasTimerState) {
    return false
  }

  const projectedParams = projectFirstUrlTimerRowToSyncParams({
    fallback: DEFAULT_SYNC_PARAMS,
    state,
  })

  return (
    params.bg === projectedParams.bg &&
    params.fg === projectedParams.fg &&
    params.m === projectedParams.m &&
    params.pc === projectedParams.pc &&
    params.s === projectedParams.s &&
    params.title === projectedParams.title
  )
}

export const serializeUrlTimerRow = (row: UrlTimerRow) => {
  const normalizedRow = buildUrlTimerRow(row)

  return [
    normalizedRow.totalSeconds.toString(),
    normalizedRow.primaryColor.replace(/^#/, ""),
    encodeURIComponent(normalizedRow.title),
    normalizedRow.flag,
  ].join("!")
}

export const buildTimerUrlSearchParams = ({
  bg,
  fg,
  extraParams = {},
  rows,
}: {
  bg?: string | null
  extraParams?: Record<string, string | null | undefined>
  fg?: string | null
  rows: UrlTimerRow[]
}) => {
  const searchParams = new URLSearchParams()
  const normalizedBg = normalizeColor(bg, DEFAULT_SYNC_PARAMS.bg)
  const normalizedFg = normalizeColor(fg, DEFAULT_SYNC_PARAMS.fg)

  let serializedRows = ""

  for (const row of rows.slice(0, MAX_TIMER_URL_ROWS)) {
    const nextSerializedRow = serializeUrlTimerRow(row)
    const candidateRows = serializedRows
      ? `${serializedRows}|${nextSerializedRow}`
      : nextSerializedRow
    const candidateSearchParams = new URLSearchParams()

    candidateSearchParams.set("v", TIMER_URL_VERSION)
    candidateSearchParams.set("t", candidateRows)
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
