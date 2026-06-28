"use client"

import { useEffect, useId, useState } from "react"
import { useTranslations } from "next-intl"

import ActionButton from "@/utils/ActionButton"
import IconButton from "@/components/IconButton"
import TimerSequenceInspector from "@/components/Sidebar/TimerSequenceInspector"
import type { SyncParams } from "@/shared/liveSession/types"
import { MAX_TITLE_LENGTH, normalizeTitle } from "@/shared/security/input"
import { getEffectiveTimerSequenceRows } from "@/shared/timerSequence"
import {
  buildTimerUrlSearchParams,
  URL_LENGTH_WARN_CHARS,
} from "@/shared/urlState"
import { ArrowDownTrayIcon } from "@/utils/icons"
import {
  addTimerSequenceRow,
  buildTimerSequenceChange,
  deleteTimerSequenceRow,
  duplicateTimerSequenceRow,
  moveTimerSequenceRow,
  replaceTimerSequenceRow,
} from "@/utils/timerSequenceEditor"

import SequenceStepCard from "./SequenceStepCard"

type SequenceRow = SyncParams["rows"][number]

export type TimerPanelProps = {
  activeIndex: number
  onActivateSequenceRow: (rowIndex: number) => void
  onOpenLoadTimerDialog: () => void
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
  onOpenLoadTimerDialog,
  onPageTitleChange,
  onSequenceChange,
  pageTitle,
  params,
}: TimerPanelProps) {
  const pageTitleInputId = useId()
  const t = useTranslations("Sidebar.timer")
  const [selectedIndex, setSelectedIndex] = useState(activeIndex)
  const [isMultiStep, setIsMultiStep] = useState(params.rows.length > 1)

  useEffect(() => {
    if (params.rows.length === 0) {
      setSelectedIndex(0)
      return
    }

    if (selectedIndex >= params.rows.length) {
      setSelectedIndex(params.rows.length - 1)
    }
  }, [params.rows.length, selectedIndex])

  useEffect(() => {
    if (params.rows.length <= 1) {
      setIsMultiStep(false)
    } else {
      setIsMultiStep(true)
    }
  }, [params.rows.length])

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
    setIsMultiStep(true)
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

  const urlLength = buildTimerUrlSearchParams({ rows: params.rows }).toString()
    .length
  const showUrlWarning = urlLength > URL_LENGTH_WARN_CHARS

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            aria-label={t("pageTitleLabel")}
            autoComplete="off"
            className="
              min-w-0 flex-1 border-none bg-transparent px-0 font-display text-2xl
              font-semibold tracking-tight text-ink outline-none
              placeholder:text-ink/42
            "
            id={pageTitleInputId}
            maxLength={MAX_TITLE_LENGTH}
            onChange={(event) =>
              onPageTitleChange(normalizeTitle(event.target.value))
            }
            onKeyDown={(event) => event.stopPropagation()}
            onKeyUp={(event) => event.stopPropagation()}
            placeholder={t("pageTitlePlaceholder")}
            spellCheck={false}
            title={t("pageTitleLabel")}
            type="text"
            value={pageTitle}
          />
          <IconButton
            aria-label={t("loadTimerTitle")}
            className="shrink-0 text-ink/42 hover:text-ink/70"
            onClick={onOpenLoadTimerDialog}
            shape="round"
            size="sm"
            title={t("loadTimerTitle")}
          >
            <ArrowDownTrayIcon className="size-4" />
          </IconButton>
        </div>
      </section>
      {!isMultiStep ? (
        <section className="space-y-4">
          <TimerSequenceInspector
            isSingleStep
            onRowChange={(nextRow) => updateRow(0, nextRow)}
            row={effectiveRows[0] ?? params.rows[0]}
            rowIndex={0}
          />
          <ActionButton fullWidth tone="secondary" onClick={handleAddRow}>
            {t("addStep")}
          </ActionButton>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="space-y-3">
            {effectiveRows.map((displayRow, index) => {
              const sourceRow = params.rows[index] ?? displayRow

              return (
                <SequenceStepCard
                  canDeleteRow={params.rows.length > 1}
                  canMoveDown={index < params.rows.length - 1}
                  canMoveUp={index > 0}
                  displayRow={displayRow}
                  index={index}
                  isActive={index === activeIndex}
                  isLastStep={index === effectiveRows.length - 1}
                  isSelected={index === selectedIndex}
                  key={index}
                  onActivate={() => activateRow(index)}
                  onDelete={() => handleDeleteRow(index)}
                  onDuplicate={() => handleDuplicateRow(index)}
                  onMoveDown={() => handleMoveRow(index, 1)}
                  onMoveUp={() => handleMoveRow(index, -1)}
                  onRowChange={(nextRow) => updateRow(index, nextRow)}
                  onSelect={() => selectRow(index)}
                  sourceRow={sourceRow}
                />
              )
            })}

            <ActionButton fullWidth tone="secondary" onClick={handleAddRow}>
              {t("addStep")}
            </ActionButton>
          </div>
        </section>
      )}
      {showUrlWarning && (
        <p
          className="
            sticky bottom-0 rounded-lg bg-amber-50 px-3 py-2 font-body
            text-xs text-amber-700
          "
        >
          {t("urlLengthWarning")}
        </p>
      )}
    </div>
  )
}
