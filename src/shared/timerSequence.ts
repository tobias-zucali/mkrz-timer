import { getMinutesSeconds } from "../utils/timeInputHelpers/index.ts"

export const DEFAULT_TIMER_PRIMARY_COLOR = "#d61f69"
export const MAX_TIMER_DURATION_SECONDS = 365 * 24 * 60 * 60

export type TimerEndBehavior = "advance" | "stop"

export type TimerSequenceRow = {
  endBehavior: TimerEndBehavior
  primaryColor: string
  repeatCount: number
  title: string
  totalSeconds: number
}

export const MAX_TIMER_SEQUENCE_REPEAT_COUNT = 99

export const buildDefaultTimerSequenceRow = (): TimerSequenceRow => ({
  endBehavior: "stop",
  primaryColor: DEFAULT_TIMER_PRIMARY_COLOR,
  repeatCount: 1,
  title: "",
  totalSeconds: 300,
})

export const clampTimerSequenceIndex = ({
  activeIndex,
  rows,
}: {
  activeIndex: number
  rows: TimerSequenceRow[]
}) => {
  if (rows.length === 0) {
    return 0
  }

  return Math.min(Math.max(Math.floor(activeIndex), 0), rows.length - 1)
}

export const getEffectiveTimerSequenceRows = (rows: TimerSequenceRow[]) => {
  let previousColor = DEFAULT_TIMER_PRIMARY_COLOR

  return rows.map((row) => {
    const primaryColor = row.primaryColor || previousColor
    previousColor = primaryColor

    return {
      ...row,
      primaryColor,
      totalSeconds: row.totalSeconds,
    }
  })
}

export const getActiveTimerSequenceRow = ({
  activeIndex,
  rows,
}: {
  activeIndex: number
  rows: TimerSequenceRow[]
}) => {
  const effectiveRows = getEffectiveTimerSequenceRows(rows)
  const normalizedActiveIndex = clampTimerSequenceIndex({
    activeIndex,
    rows: effectiveRows,
  })

  return {
    activeIndex: normalizedActiveIndex,
    row: effectiveRows[normalizedActiveIndex] ?? buildDefaultTimerSequenceRow(),
    rows: effectiveRows,
  }
}

export const buildDurationPartsFromTotalSeconds = (totalSeconds: number) => {
  const [minutes, seconds] = getMinutesSeconds(
    Math.min(Math.max(Math.floor(totalSeconds), 0), MAX_TIMER_DURATION_SECONDS),
  )

  return {
    m: minutes,
    s: seconds,
  }
}
