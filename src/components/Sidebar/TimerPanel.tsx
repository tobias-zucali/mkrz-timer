"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"

import InputField from "@/components/InputField"
import type { SyncParams } from "@/shared/remoteSession/types"
import { MAX_TITLE_LENGTH } from "@/shared/security/input"
import {
  buildDurationPartsFromTotalSeconds,
  getEffectiveTimerSequenceRows,
} from "@/shared/timerSequence"
import ColorSwatchField from "@/utils/ColorSwatchField"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DocumentDuplicateIcon,
  TrashIcon,
} from "@/utils/icons"
import { normalizeTimeParts } from "@/utils/timeInputHelpers"
import {
  addTimerSequenceRow,
  buildTimerSequenceChange,
  deleteTimerSequenceRow,
  duplicateTimerSequenceRow,
  moveTimerSequenceRow,
  replaceTimerSequenceRow,
} from "@/utils/timerSequenceEditor"

const iconButtonClassName =
  "inline-flex size-8 cursor-pointer items-center justify-center rounded-full border " +
  "border-foreground/12 text-foreground/72 transition hover:border-primary/40 " +
  "hover:text-foreground focus:outline-2 focus:-outline-offset-2 focus:outline-primary"

const primaryButtonClassName =
  "cursor-pointer rounded-md bg-primary px-3 py-2 text-sm font-semibold text-foreground " +
  "transition hover:bg-primary/88 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"

const stateBadgeClassName =
  "rounded-full px-2 py-0.5 text-[0.68rem] font-semibold"

const endBehaviorOptions = [
  { label: "Stop after completion", value: "stop" },
  { label: "Auto-advance / loop", value: "advance" },
] as const

const repetitionOptions = Array.from({ length: 9 }, (_, index) => {
  const value = index + 1

  return {
    label: `${value}`,
    value: `${value}`,
  }
})

type SequenceRow = SyncParams["rows"][number]

const buildSummaryText = (row: SequenceRow) => {
  const duration = buildDurationPartsFromTotalSeconds(row.totalSeconds)
  const parts = [`${duration.m}:${duration.s}`]

  if (row.repeatCount > 1) {
    parts.push(`x${row.repeatCount}`)
  }

  if (row.endBehavior === "advance") {
    parts.push("Auto-advance")
  }

  return parts.join(" • ")
}

const getCardAccentStyle = ({
  isSelected,
  primaryColor,
}: {
  isSelected: boolean
  primaryColor: string
}) => ({
  borderColor: `${primaryColor}${isSelected ? "cc" : "36"}`,
  boxShadow: `inset 0 0 0 1px ${
    isSelected ? `${primaryColor}3d` : "transparent"
  }`,
})

export default function TimerPanel({
  activeIndex,
  onActivateSequenceRow,
  onSequenceChange,
  params,
}: {
  activeIndex: number
  onActivateSequenceRow: (rowIndex: number) => void
  onSequenceChange: (nextChange: {
    activeIndex: number
    rows: SyncParams["rows"]
  }) => void
  params: SyncParams
}) {
  const [selectedIndex, setSelectedIndex] = useState(activeIndex)
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (params.rows.length === 0) {
      setSelectedIndex(0)
      return
    }

    if (selectedIndex >= params.rows.length) {
      setSelectedIndex(params.rows.length - 1)
    }
  }, [params.rows.length, selectedIndex])

  useLayoutEffect(() => {
    const textarea = titleTextareaRef.current
    if (!textarea) {
      return
    }

    textarea.style.height = "0px"
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [params.rows, selectedIndex])

  const effectiveRows = getEffectiveTimerSequenceRows(params.rows)

  const commitRowsChange = (nextChange: {
    activeIndex: number
    rows: SyncParams["rows"]
  }) => {
    onSequenceChange(buildTimerSequenceChange(nextChange))
  }

  const updateRow = (rowIndex: number, nextRow: SequenceRow) => {
    commitRowsChange({
      activeIndex,
      rows: replaceTimerSequenceRow({
        nextRow,
        rowIndex,
        rows: params.rows,
      }),
    })
  }

  const updateRowDuration = ({
    minutes,
    row,
    rowIndex,
    seconds,
  }: {
    minutes: string
    row: SequenceRow
    rowIndex: number
    seconds: string
  }) => {
    const normalized = normalizeTimeParts({ minutes, seconds })
    updateRow(rowIndex, {
      ...row,
      totalSeconds: normalized.totalSeconds,
    })
  }

  const activateRow = (rowIndex: number) => {
    commitRowsChange({
      activeIndex: rowIndex,
      rows: params.rows,
    })
    onActivateSequenceRow(rowIndex)
  }

  const selectRow = (rowIndex: number) => {
    setSelectedIndex(rowIndex)
  }

  const handleAddRow = () => {
    const nextRows = addTimerSequenceRow(params.rows)
    const nextIndex = Math.max(nextRows.length - 1, 0)
    setSelectedIndex(nextIndex)
    commitRowsChange({
      activeIndex,
      rows: nextRows,
    })
  }

  const handleMoveRow = (rowIndex: number, direction: -1 | 1) => {
    const targetIndex = rowIndex + direction
    if (targetIndex < 0 || targetIndex >= params.rows.length) {
      return
    }

    const nextSelectedIndex =
      selectedIndex === rowIndex
        ? targetIndex
        : selectedIndex === targetIndex
          ? rowIndex
          : selectedIndex

    setSelectedIndex(nextSelectedIndex)
    commitRowsChange(
      moveTimerSequenceRow({
        activeIndex,
        direction,
        rowIndex,
        rows: params.rows,
      }),
    )
  }

  const handleDuplicateRow = (rowIndex: number) => {
    const nextRows = duplicateTimerSequenceRow({
      rowIndex,
      rows: params.rows,
    })
    const nextIndex =
      nextRows.length > params.rows.length
        ? rowIndex + 1
        : Math.min(rowIndex, nextRows.length - 1)

    setSelectedIndex(nextIndex)
    commitRowsChange({
      activeIndex,
      rows: nextRows,
    })
  }

  const handleDeleteRow = (rowIndex: number) => {
    const nextIndex =
      rowIndex < params.rows.length - 1 ? rowIndex : Math.max(rowIndex - 1, 0)

    setSelectedIndex(nextIndex)
    onSequenceChange(
      deleteTimerSequenceRow({
        activeIndex,
        rowIndex,
        rows: params.rows,
      }),
    )
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Sequence</h3>
        </div>

        <div className="space-y-3">
          {effectiveRows.map((displayRow, index) => {
            const sourceRow = params.rows[index] ?? displayRow
            const isActive = index === activeIndex
            const isSelected = index === selectedIndex
            const duration = buildDurationPartsFromTotalSeconds(
              sourceRow.totalSeconds,
            )
            const canMoveUp = index > 0
            const canMoveDown = index < params.rows.length - 1

            return (
              <section
                className={`rounded-2xl border bg-background p-4 transition ${
                  isSelected ? "" : "cursor-pointer"
                }`}
                key={index}
                onClick={() => {
                  if (!isSelected) {
                    selectRow(index)
                  }
                }}
                style={getCardAccentStyle({
                  isSelected,
                  primaryColor: displayRow.primaryColor,
                })}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-semibold tracking-[0.14em] uppercase"
                        style={{ color: displayRow.primaryColor }}
                      >
                        Step {index + 1}
                      </span>
                      {isActive ? (
                        <span
                          className={`${stateBadgeClassName} text-foreground`}
                          style={{ backgroundColor: displayRow.primaryColor }}
                        >
                          Active
                        </span>
                      ) : (
                        <button
                          className={`${stateBadgeClassName} cursor-pointer border bg-transparent`}
                          onClick={(event) => {
                            event.stopPropagation()
                            activateRow(index)
                          }}
                          style={{
                            borderColor: `${displayRow.primaryColor}cc`,
                            color: displayRow.primaryColor,
                          }}
                          type="button"
                        >
                          Make Active
                        </button>
                      )}
                    </div>

                    <div className="mt-2 min-w-0 text-left">
                      {!isSelected && sourceRow.title ? (
                        <p className="truncate text-sm font-semibold text-foreground">
                          {sourceRow.title}
                        </p>
                      ) : null}
                      {!isSelected ? (
                        <p className="mt-1 text-xs text-foreground/62">
                          {buildSummaryText(displayRow)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="-mt-1 -mr-1 flex shrink-0 flex-wrap justify-end gap-1 self-start">
                    {canMoveUp ? (
                      <button
                        aria-label={`Move step ${index + 1} up`}
                        className={iconButtonClassName}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleMoveRow(index, -1)
                        }}
                        type="button"
                      >
                        <ArrowUpIcon className="size-4" />
                      </button>
                    ) : null}
                    {canMoveDown ? (
                      <button
                        aria-label={`Move step ${index + 1} down`}
                        className={iconButtonClassName}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleMoveRow(index, 1)
                        }}
                        type="button"
                      >
                        <ArrowDownIcon className="size-4" />
                      </button>
                    ) : null}
                    <button
                      aria-label={`Duplicate step ${index + 1}`}
                      className={iconButtonClassName}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleDuplicateRow(index)
                      }}
                      type="button"
                    >
                      <DocumentDuplicateIcon className="size-4" />
                    </button>
                    <button
                      aria-label={`Delete step ${index + 1}`}
                      className={iconButtonClassName}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleDeleteRow(index)
                      }}
                      type="button"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                </div>

                {isSelected ? (
                  <div className="mt-4 space-y-4 pt-1">
                    <div className="w-full">
                      <label
                        className="mb-2 block text-sm font-medium text-foreground"
                        htmlFor={`sidebar-sequence-title-${index}`}
                      >
                        Title
                      </label>
                      <textarea
                        className="
                          block min-h-0 w-full resize-none overflow-hidden rounded-md border border-foreground/10
                          bg-background px-3 py-2 text-sm/6 text-foreground outline-1
                          -outline-offset-1 outline-foreground/10
                          placeholder:text-foreground/50 focus:outline-2
                          focus:-outline-offset-2 focus:outline-primary
                        "
                        id={`sidebar-sequence-title-${index}`}
                        maxLength={MAX_TITLE_LENGTH}
                        onChange={(event) =>
                          updateRow(index, {
                            ...sourceRow,
                            title: event.target.value,
                          })
                        }
                        onKeyDown={(event) => event.stopPropagation()}
                        onKeyUp={(event) => event.stopPropagation()}
                        ref={titleTextareaRef}
                        rows={1}
                        value={sourceRow.title}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <InputField
                        id={`sidebar-sequence-minutes-${index}`}
                        inputMode="numeric"
                        label="Minutes"
                        onBlur={() =>
                          updateRowDuration({
                            minutes: duration.m,
                            row: sourceRow,
                            rowIndex: index,
                            seconds: duration.s,
                          })
                        }
                        onChange={(event) =>
                          updateRowDuration({
                            minutes: event.target.value,
                            row: sourceRow,
                            rowIndex: index,
                            seconds: duration.s,
                          })
                        }
                        type="number"
                        value={duration.m}
                      />
                      <InputField
                        id={`sidebar-sequence-seconds-${index}`}
                        inputMode="numeric"
                        label="Seconds"
                        onBlur={() =>
                          updateRowDuration({
                            minutes: duration.m,
                            row: sourceRow,
                            rowIndex: index,
                            seconds: duration.s,
                          })
                        }
                        onChange={(event) =>
                          updateRowDuration({
                            minutes: duration.m,
                            row: sourceRow,
                            rowIndex: index,
                            seconds: event.target.value,
                          })
                        }
                        type="number"
                        value={duration.s}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label
                          className="mb-2 block text-sm font-medium text-foreground"
                          htmlFor={`sidebar-sequence-repeat-count-${index}`}
                        >
                          Repetitions
                        </label>
                        <select
                          className="
                            block h-10 w-full rounded-md border border-foreground/10
                            bg-background px-3 text-sm text-foreground outline-1
                            -outline-offset-1 outline-foreground/10
                            focus:outline-2 focus:-outline-offset-2 focus:outline-primary
                          "
                          id={`sidebar-sequence-repeat-count-${index}`}
                          onChange={(event) =>
                            updateRow(index, {
                              ...sourceRow,
                              repeatCount: Number.parseInt(
                                event.target.value,
                                10,
                              ),
                            })
                          }
                          value={String(sourceRow.repeatCount)}
                        >
                          {repetitionOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label
                          className="mb-2 block text-sm font-medium text-foreground"
                          htmlFor={`sidebar-sequence-end-behavior-${index}`}
                        >
                          End Behavior
                        </label>
                        <select
                          className="
                          block h-10 w-full rounded-md border border-foreground/10
                          bg-background px-3 text-sm text-foreground outline-1
                          -outline-offset-1 outline-foreground/10
                          focus:outline-2 focus:-outline-offset-2 focus:outline-primary
                        "
                          id={`sidebar-sequence-end-behavior-${index}`}
                          onChange={(event) =>
                            updateRow(index, {
                              ...sourceRow,
                              endBehavior: event.target
                                .value as SyncParams["rows"][number]["endBehavior"],
                            })
                          }
                          value={sourceRow.endBehavior}
                        >
                          {endBehaviorOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <ColorSwatchField
                        id={`sidebar-sequence-primary-${index}`}
                        label="Primary Color"
                        onChange={(event) =>
                          updateRow(index, {
                            ...sourceRow,
                            primaryColor: event.target.value,
                          })
                        }
                        value={sourceRow.primaryColor}
                      />
                    </div>
                  </div>
                ) : null}
              </section>
            )
          })}

          <button
            className={`${primaryButtonClassName} w-full`}
            onClick={handleAddRow}
            type="button"
          >
            Add Step
          </button>
        </div>
      </section>
    </div>
  )
}
