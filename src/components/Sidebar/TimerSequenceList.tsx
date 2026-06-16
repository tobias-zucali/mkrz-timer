"use client"

import { buildDurationPartsFromTotalSeconds } from "@/shared/timerSequence"
import type { SyncParams } from "@/shared/liveSession/types"

const rowActionClassName =
  "rounded-md border border-ink/12 px-2.5 py-1.5 text-xs font-semibold text-ink/72 transition hover:border-primary/40 hover:text-ink focus:outline-2 focus:-outline-offset-2 focus:outline-primary"

export default function TimerSequenceList({
  activeIndex,
  onActivateRow,
  onMoveRow,
  onSelectRow,
  rows,
  selectedIndex,
}: {
  activeIndex: number
  onActivateRow: (rowIndex: number) => void
  onMoveRow: (rowIndex: number, direction: -1 | 1) => void
  onSelectRow: (rowIndex: number) => void
  rows: SyncParams["rows"]
  selectedIndex: number
}) {
  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const duration = buildDurationPartsFromTotalSeconds(row.totalSeconds)
        const isActive = index === activeIndex
        const isSelected = index === selectedIndex

        return (
          <div
            className={`
              flex w-full flex-col gap-3 rounded-2xl border px-4 py-3
              text-left transition
              ${
                isSelected
                  ? "border-primary/60 bg-primary/8"
                  : "border-ink/10 bg-screen hover:border-primary/30"
              }
            `}
            key={`${row.title}-${index}`}
            onClick={() => onSelectRow(index)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-[0.14em] text-ink/52 uppercase">
                    Step {index + 1}
                  </span>
                  {isActive ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[0.68rem] font-semibold text-white">
                      Active
                    </span>
                  ) : null}
                  {isSelected ? (
                    <span className="rounded-full border border-primary/30 px-2 py-0.5 text-[0.68rem] font-semibold text-primary">
                      Editing
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-ink">
                  {row.title || "Untitled step"}
                </p>
                <p className="mt-1 text-xs text-ink/62">
                  {duration.m}:{duration.s} • x{row.repeatCount} •{" "}
                  {row.endBehavior === "advance" ? "Auto-advance" : "Stop"}
                </p>
              </div>
              <span
                className="mt-1 size-3 shrink-0 rounded-full border border-ink/10"
                style={{ backgroundColor: row.primaryColor }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={rowActionClassName}
                onClick={() => onActivateRow(index)}
                type="button"
              >
                Use now
              </button>
              <button
                className={rowActionClassName}
                onClick={() => onMoveRow(index, -1)}
                type="button"
              >
                Move up
              </button>
              <button
                className={rowActionClassName}
                onClick={() => onMoveRow(index, 1)}
                type="button"
              >
                Move down
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
