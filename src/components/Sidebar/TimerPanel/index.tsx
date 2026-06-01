"use client"

import { useEffect, useId, useState } from "react"
import { useTranslations } from "next-intl"

import TimerSequenceInspector from "@/components/Sidebar/TimerSequenceInspector"
import type { SyncParams } from "@/shared/liveSession/types"
import { MAX_TITLE_LENGTH, normalizeTitle } from "@/shared/security/input"
import {
  buildDurationPartsFromTotalSeconds,
  getEffectiveTimerSequenceRows,
} from "@/shared/timerSequence"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DocumentDuplicateIcon,
  TrashIcon,
} from "@/utils/icons"
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

type SequenceRow = SyncParams["rows"][number]

const buildSummaryText = (
  row: SequenceRow,
  t: ReturnType<typeof useTranslations>,
) => {
  const duration = buildDurationPartsFromTotalSeconds(row.totalSeconds)
  const parts = [`${duration.m}:${duration.s}`]

  if (row.repeatCount > 1) {
    parts.push(t("repeatSummary", { count: row.repeatCount }))
  }

  if (row.endBehavior === "advance") {
    parts.push(t("autoAdvance"))
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

export type TimerPanelProps = {
  activeIndex: number
  onActivateSequenceRow: (rowIndex: number) => void
  onPageTitleChange: (title: string) => void
  onSequenceChange: (nextChange: {
    activeIndex: number
    rows: SyncParams["rows"]
  }) => void
  pageTitle: string
  params: SyncParams
}

export default function TimerPanel({
  activeIndex,
  onActivateSequenceRow,
  onPageTitleChange,
  onSequenceChange,
  pageTitle,
  params,
}: TimerPanelProps) {
  const pageTitleInputId = useId()
  const t = useTranslations("Sidebar.timer")
  const [selectedIndex, setSelectedIndex] = useState(activeIndex)

  useEffect(() => {
    if (params.rows.length === 0) {
      setSelectedIndex(0)
      return
    }

    if (selectedIndex >= params.rows.length) {
      setSelectedIndex(params.rows.length - 1)
    }
  }, [params.rows.length, selectedIndex])

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
      <section className="space-y-2">
        <label className="sr-only" htmlFor={pageTitleInputId}>
          {t("pageTitleLabel")}
        </label>
        <input
          autoComplete="off"
          className="
            block w-full border-none bg-transparent px-0 text-2xl font-semibold
            text-foreground outline-none placeholder:text-foreground/42
          "
          data-testid="sidebar-page-title-input"
          id={pageTitleInputId}
          maxLength={MAX_TITLE_LENGTH}
          onChange={(event) =>
            onPageTitleChange(normalizeTitle(event.target.value))
          }
          onKeyDown={(event) => event.stopPropagation()}
          onKeyUp={(event) => event.stopPropagation()}
          placeholder={t("pageTitlePlaceholder")}
          spellCheck={false}
          type="text"
          value={pageTitle}
        />
      </section>
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t("heading")}
          </h3>
        </div>

        <div className="space-y-3">
          {effectiveRows.map((displayRow, index) => {
            const sourceRow = params.rows[index] ?? displayRow
            const isActive = index === activeIndex
            const isSelected = index === selectedIndex
            const canMoveUp = index > 0
            const canMoveDown = index < params.rows.length - 1
            const canDeleteRow = params.rows.length > 1

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
                        {t("step", { step: index + 1 })}
                      </span>
                      {isActive ? (
                        <span
                          className={`${stateBadgeClassName} text-foreground`}
                          style={{ backgroundColor: displayRow.primaryColor }}
                        >
                          {t("active")}
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
                          {t("makeActive")}
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
                          {buildSummaryText(displayRow, t)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="-mt-1 -mr-1 flex shrink-0 flex-wrap justify-end gap-1 self-start">
                    {canMoveUp ? (
                      <button
                        aria-label={t("moveStepUp", {
                          step: index + 1,
                        })}
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
                        aria-label={t("moveStepDown", {
                          step: index + 1,
                        })}
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
                      aria-label={t("duplicateStep", {
                        step: index + 1,
                      })}
                      className={iconButtonClassName}
                      onClick={(event) => {
                        event.stopPropagation()
                        handleDuplicateRow(index)
                      }}
                      type="button"
                    >
                      <DocumentDuplicateIcon className="size-4" />
                    </button>
                    {canDeleteRow ? (
                      <button
                        aria-label={t("deleteStep", {
                          step: index + 1,
                        })}
                        className={iconButtonClassName}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDeleteRow(index)
                        }}
                        type="button"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {isSelected ? (
                  <TimerSequenceInspector
                    onRowChange={(nextRow) => updateRow(index, nextRow)}
                    row={sourceRow}
                    rowIndex={index}
                  />
                ) : null}
              </section>
            )
          })}

          <button
            className={`${primaryButtonClassName} w-full`}
            onClick={handleAddRow}
            type="button"
          >
            {t("addStep")}
          </button>
        </div>
      </section>
    </div>
  )
}
