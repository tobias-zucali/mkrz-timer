"use client"

import { useEffect, useState } from "react"

import InputField from "@/components/InputField"
import type { SyncParams } from "@/shared/remoteSession/types"
import { MAX_TITLE_LENGTH } from "@/shared/security/input"
import { buildDurationPartsFromTotalSeconds } from "@/shared/timerSequence"
import ColorSwatchField from "@/utils/ColorSwatchField"
import { normalizeTimeParts } from "@/utils/timeInputHelpers"

const rowActionClassName =
  "rounded-md border border-foreground/12 px-2.5 py-1.5 text-xs font-semibold text-foreground/72 transition hover:border-primary/40 hover:text-foreground focus:outline-2 focus:-outline-offset-2 focus:outline-primary"

const endBehaviorOptions = [
  { label: "Stop after completion", value: "stop" },
  { label: "Auto-advance / loop", value: "advance" },
] as const

export default function TimerSequenceInspector({
  onDelete,
  onDuplicate,
  onRowChange,
  row,
  rowIndex,
}: {
  onDelete: () => void
  onDuplicate: () => void
  onRowChange: (nextRow: SyncParams["rows"][number]) => void
  row: SyncParams["rows"][number]
  rowIndex: number
}) {
  const duration = buildDurationPartsFromTotalSeconds(row.totalSeconds)
  const [minutesValue, setMinutesValue] = useState(duration.m)
  const [secondsValue, setSecondsValue] = useState(duration.s)

  useEffect(() => {
    setMinutesValue(duration.m)
    setSecondsValue(duration.s)
  }, [duration.m, duration.s, rowIndex])

  const commitDurationChange = ({
    minutes,
    seconds,
  }: {
    minutes: string
    seconds: string
  }) => {
    const normalized = normalizeTimeParts({ minutes, seconds })
    setMinutesValue(normalized.minutes)
    setSecondsValue(normalized.seconds)
    onRowChange({ ...row, totalSeconds: normalized.totalSeconds })
  }

  return (
    <div className="space-y-4 rounded-2xl border border-foreground/10 bg-background/80 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Step {rowIndex + 1} Details
          </h4>
          <p className="mt-1 text-sm/6 text-foreground/62">
            Edit the selected step without changing the active timer until you
            choose <span className="font-semibold">Use now</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={rowActionClassName}
            onClick={onDuplicate}
            type="button"
          >
            Duplicate
          </button>
          <button
            className={rowActionClassName}
            onClick={onDelete}
            type="button"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="w-full">
          <label
            className="mb-2 block text-sm font-medium text-foreground"
            htmlFor="sidebar-sequence-title"
          >
            Title
          </label>
          <textarea
            className="
              block min-h-10 w-full resize-y rounded-md border border-foreground/10
              bg-background px-3 py-2 text-sm/6 text-foreground outline-1
              -outline-offset-1 outline-foreground/10
              placeholder:text-foreground/50 focus:outline-2
              focus:-outline-offset-2 focus:outline-primary
            "
            id="sidebar-sequence-title"
            maxLength={MAX_TITLE_LENGTH}
            name="sidebar-sequence-title"
            onChange={(event) =>
              onRowChange({ ...row, title: event.target.value })
            }
            onKeyDown={(event) => event.stopPropagation()}
            onKeyUp={(event) => event.stopPropagation()}
            rows={2}
            value={row.title}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            id="sidebar-sequence-minutes"
            inputMode="numeric"
            label="Minutes"
            onBlur={() =>
              commitDurationChange({
                minutes: minutesValue,
                seconds: secondsValue,
              })
            }
            onChange={(event) => {
              const nextMinutes = event.target.value
              setMinutesValue(nextMinutes)
              commitDurationChange({
                minutes: nextMinutes,
                seconds: secondsValue,
              })
            }}
            type="number"
            value={minutesValue}
          />
          <InputField
            id="sidebar-sequence-seconds"
            inputMode="numeric"
            label="Seconds"
            onBlur={() =>
              commitDurationChange({
                minutes: minutesValue,
                seconds: secondsValue,
              })
            }
            onChange={(event) => {
              const nextSeconds = event.target.value
              setSecondsValue(nextSeconds)
              commitDurationChange({
                minutes: minutesValue,
                seconds: nextSeconds,
              })
            }}
            type="number"
            value={secondsValue}
          />
        </div>

        <ColorSwatchField
          id="sidebar-sequence-primary"
          label="Primary Color"
          onChange={(event) =>
            onRowChange({
              ...row,
              primaryColor: event.target.value,
            })
          }
          value={row.primaryColor}
        />

        <InputField
          id="sidebar-sequence-repeat-count"
          inputMode="numeric"
          label="Repetitions"
          onChange={(event) =>
            onRowChange({
              ...row,
              repeatCount: Math.max(
                1,
                Number.parseInt(event.target.value || "1", 10) || 1,
              ),
            })
          }
          type="number"
          value={row.repeatCount}
        />

        <div>
          <label
            className="mb-2 block text-sm font-medium text-foreground"
            htmlFor="sidebar-sequence-end-behavior"
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
            id="sidebar-sequence-end-behavior"
            onChange={(event) =>
              onRowChange({
                ...row,
                endBehavior: event.target
                  .value as SyncParams["rows"][number]["endBehavior"],
              })
            }
            value={row.endBehavior}
          >
            {endBehaviorOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
