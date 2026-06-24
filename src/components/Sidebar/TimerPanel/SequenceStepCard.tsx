"use client"

import { useTranslations } from "next-intl"

import IconButton from "@/components/IconButton"
import TimerSequenceInspector from "@/components/Sidebar/TimerSequenceInspector"
import type { SyncParams } from "@/shared/liveSession/types"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DocumentDuplicateIcon,
  TrashIcon,
} from "@/utils/icons"

import {
  buildSummaryText,
  getCardAccentStyle,
  stateBadgeClassName,
} from "./utils"

type SequenceRow = SyncParams["rows"][number]

export type SequenceStepCardProps = {
  canDeleteRow: boolean
  canMoveDown: boolean
  canMoveUp: boolean
  displayRow: SequenceRow
  index: number
  isActive: boolean
  isLastStep: boolean
  isSelected: boolean
  onActivate: () => void
  onDelete: () => void
  onDuplicate: () => void
  onMoveDown: () => void
  onMoveUp: () => void
  onRowChange: (nextRow: SequenceRow) => void
  onSelect: () => void
  sourceRow: SequenceRow
}

export default function SequenceStepCard({
  canDeleteRow,
  canMoveDown,
  canMoveUp,
  displayRow,
  index,
  isActive,
  isLastStep,
  isSelected,
  onActivate,
  onDelete,
  onDuplicate,
  onMoveDown,
  onMoveUp,
  onRowChange,
  onSelect,
  sourceRow,
}: SequenceStepCardProps) {
  const t = useTranslations("Sidebar.timer")

  return (
    <section
      className={`rounded-card border bg-card p-4 shadow-[0_18px_44px_rgba(0,0,0,0.12)] transition ${
        isSelected ? "" : "cursor-pointer"
      }`}
      onClick={() => {
        if (!isSelected) {
          onSelect()
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
              className="panel-label text-xs"
              style={{ color: displayRow.primaryColor }}
            >
              {t("step", { step: index + 1 })}
            </span>
            {isActive ? (
              <span
                className={`${stateBadgeClassName} text-white`}
                style={{ backgroundColor: displayRow.primaryColor }}
              >
                {t("active")}
              </span>
            ) : (
              <button
                className={`${stateBadgeClassName} cursor-pointer border bg-transparent`}
                onClick={(event) => {
                  event.stopPropagation()
                  onActivate()
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
              <p className="truncate font-display text-base font-semibold text-ink">
                {sourceRow.title}
              </p>
            ) : null}
            {!isSelected ? (
              <p className="mt-1 text-xs text-ink/62">
                {buildSummaryText(displayRow, t)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="-mt-1 -mr-1 flex shrink-0 flex-wrap justify-end gap-1 self-start">
          {canMoveUp ? (
            <IconButton
              aria-label={t("moveStepUp", { step: index + 1 })}
              className="border-hairline bg-input-bg text-ink/70 hover:border-primary/45 hover:text-primary"
              onClick={(event) => {
                event.stopPropagation()
                onMoveUp()
              }}
              shape="round"
              size="sm"
              title={t("moveStepUp", { step: index + 1 })}
            >
              <ArrowUpIcon className="size-4" />
            </IconButton>
          ) : null}
          {canMoveDown ? (
            <IconButton
              aria-label={t("moveStepDown", { step: index + 1 })}
              className="border-hairline bg-input-bg text-ink/70 hover:border-primary/45 hover:text-primary"
              onClick={(event) => {
                event.stopPropagation()
                onMoveDown()
              }}
              shape="round"
              size="sm"
              title={t("moveStepDown", { step: index + 1 })}
            >
              <ArrowDownIcon className="size-4" />
            </IconButton>
          ) : null}
          <IconButton
            aria-label={t("duplicateStep", { step: index + 1 })}
            className="border-hairline bg-input-bg text-ink/70 hover:border-primary/45 hover:text-primary"
            onClick={(event) => {
              event.stopPropagation()
              onDuplicate()
            }}
            shape="round"
            size="sm"
            title={t("duplicateStep", { step: index + 1 })}
          >
            <DocumentDuplicateIcon className="size-4" />
          </IconButton>
          {canDeleteRow ? (
            <IconButton
              aria-label={t("deleteStep", { step: index + 1 })}
              className="border-hairline bg-input-bg text-ink/70 hover:border-primary/45 hover:text-primary"
              onClick={(event) => {
                event.stopPropagation()
                onDelete()
              }}
              shape="round"
              size="sm"
              title={t("deleteStep", { step: index + 1 })}
            >
              <TrashIcon className="size-4" />
            </IconButton>
          ) : null}
        </div>
      </div>

      {isSelected ? (
        <TimerSequenceInspector
          isLastStep={isLastStep}
          onRowChange={onRowChange}
          row={sourceRow}
          rowIndex={index}
        />
      ) : null}
    </section>
  )
}
