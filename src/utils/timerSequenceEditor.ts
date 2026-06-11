import type { SyncParams } from "@/shared/liveSession/types"
import {
  buildDefaultTimerSequenceRow,
  clampTimerSequenceIndex,
} from "@/shared/timerSequence"
import { MAX_TIMER_URL_ROWS } from "@/shared/urlState"

type TimerSequenceRows = SyncParams["rows"]

export type TimerSequenceChange = {
  activeIndex: number
  rows: TimerSequenceRows
}

const normalizeSequenceRows = (rows: TimerSequenceRows) =>
  rows.length > 0 ? rows : [buildDefaultTimerSequenceRow()]

export const buildTimerSequenceChange = ({
  activeIndex,
  rows,
}: TimerSequenceChange): TimerSequenceChange => {
  const normalizedRows = normalizeSequenceRows(rows)

  return {
    activeIndex: clampTimerSequenceIndex({
      activeIndex,
      rows: normalizedRows,
    }),
    rows: normalizedRows,
  }
}

export const replaceTimerSequenceRow = ({
  nextRow,
  rowIndex,
  rows,
}: {
  nextRow: TimerSequenceRows[number]
  rowIndex: number
  rows: TimerSequenceRows
}) => rows.map((row, index) => (index === rowIndex ? nextRow : row))

export const addTimerSequenceRow = (rows: TimerSequenceRows) => {
  if (rows.length >= MAX_TIMER_URL_ROWS) {
    return rows
  }

  const sourceRow = rows[rows.length - 1] ?? buildDefaultTimerSequenceRow()

  return [
    ...rows,
    {
      ...sourceRow,
      title: "",
    },
  ]
}

export const duplicateTimerSequenceRow = ({
  rowIndex,
  rows,
}: {
  rowIndex: number
  rows: TimerSequenceRows
}) => {
  if (rows.length >= MAX_TIMER_URL_ROWS) {
    return rows
  }

  const sourceRow = rows[rowIndex]
  if (!sourceRow) {
    return rows
  }

  const nextRows = [...rows]
  nextRows.splice(rowIndex + 1, 0, { ...sourceRow })

  return nextRows
}

export const deleteTimerSequenceRow = ({
  activeIndex,
  rowIndex,
  rows,
}: {
  activeIndex: number
  rowIndex: number
  rows: TimerSequenceRows
}): TimerSequenceChange => {
  const nextRows = rows.filter((_, index) => index !== rowIndex)
  const nextActiveIndex =
    rowIndex < activeIndex
      ? activeIndex - 1
      : rowIndex === activeIndex
        ? Math.max(activeIndex - 1, 0)
        : activeIndex

  return buildTimerSequenceChange({
    activeIndex: nextActiveIndex,
    rows: nextRows,
  })
}

export const moveTimerSequenceRow = ({
  activeIndex,
  direction,
  rowIndex,
  rows,
}: {
  activeIndex: number
  direction: -1 | 1
  rowIndex: number
  rows: TimerSequenceRows
}): TimerSequenceChange => {
  const targetIndex = rowIndex + direction
  if (targetIndex < 0 || targetIndex >= rows.length) {
    return buildTimerSequenceChange({ activeIndex, rows })
  }

  const nextRows = [...rows]
  const [movedRow] = nextRows.splice(rowIndex, 1)
  nextRows.splice(targetIndex, 0, movedRow)

  const nextActiveIndex =
    activeIndex === rowIndex
      ? targetIndex
      : activeIndex === targetIndex
        ? rowIndex
        : activeIndex

  return buildTimerSequenceChange({
    activeIndex: nextActiveIndex,
    rows: nextRows,
  })
}
