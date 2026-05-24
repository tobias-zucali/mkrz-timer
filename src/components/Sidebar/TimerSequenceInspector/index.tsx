"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { useTranslations } from "next-intl"

import InputField from "@/components/InputField"
import type { SyncParams } from "@/shared/remoteSession/types"
import { MAX_TITLE_LENGTH } from "@/shared/security/input"
import { buildDurationPartsFromTotalSeconds } from "@/shared/timerSequence"
import ColorSwatchField from "@/utils/ColorSwatchField"
import { normalizeTimeParts } from "@/utils/timeInputHelpers"

const selectedFieldClassName =
  "focus:border-(--step-color) focus:outline-(--step-color)"

export default function TimerSequenceInspector({
  onRowChange,
  row,
  rowIndex,
}: {
  onRowChange: (nextRow: SyncParams["rows"][number]) => void
  row: SyncParams["rows"][number]
  rowIndex: number
}) {
  const t = useTranslations("Sidebar.timerSequenceInspector")
  const duration = buildDurationPartsFromTotalSeconds(row.totalSeconds)
  const [minutesValue, setMinutesValue] = useState(duration.m)
  const [secondsValue, setSecondsValue] = useState(duration.s)
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null)
  const endBehaviorOptions = [
    { label: t("endBehaviorStop"), value: "stop" },
    { label: t("endBehaviorContinue"), value: "advance" },
  ] as const

  useEffect(() => {
    setMinutesValue(duration.m)
    setSecondsValue(duration.s)
  }, [duration.m, duration.s, rowIndex])

  useLayoutEffect(() => {
    const textarea = titleTextareaRef.current
    if (!textarea) {
      return
    }

    textarea.style.height = "0px"
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [row.title])

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
    <div
      className="mt-4 space-y-4 pt-1"
      style={
        {
          "--step-color": row.primaryColor,
        } as CSSProperties
      }
    >
      <div className="w-full">
        <label
          className="mb-2 block text-sm font-medium text-foreground"
          htmlFor={`sidebar-sequence-title-${rowIndex}`}
        >
          {t("title")}
        </label>
        <textarea
          className="
            block min-h-0 w-full resize-none overflow-hidden rounded-md border border-foreground/10
            bg-background px-3 py-2 text-sm/6 text-foreground outline-1
            -outline-offset-1 outline-foreground/10
            placeholder:text-foreground/50 focus:outline-2
            focus:-outline-offset-2 focus:outline-(--step-color)
          "
          id={`sidebar-sequence-title-${rowIndex}`}
          maxLength={MAX_TITLE_LENGTH}
          onChange={(event) =>
            onRowChange({ ...row, title: event.target.value })
          }
          onKeyDown={(event) => event.stopPropagation()}
          onKeyUp={(event) => event.stopPropagation()}
          ref={titleTextareaRef}
          rows={1}
          value={row.title}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InputField
          className={selectedFieldClassName}
          id={`sidebar-sequence-minutes-${rowIndex}`}
          inputMode="numeric"
          label={t("minutes")}
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
          className={selectedFieldClassName}
          id={`sidebar-sequence-seconds-${rowIndex}`}
          inputMode="numeric"
          label={t("seconds")}
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

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label
            className="mb-2 block text-sm font-medium text-foreground"
            htmlFor={`sidebar-sequence-repeat-count-${rowIndex}`}
          >
            {t("repetitions")}
          </label>
          <select
            className="
              block h-10 w-full rounded-md border border-foreground/10
              bg-background px-3 text-sm text-foreground outline-1
              -outline-offset-1 outline-foreground/10
              focus:outline-2 focus:-outline-offset-2 focus:outline-(--step-color)
            "
            id={`sidebar-sequence-repeat-count-${rowIndex}`}
            onChange={(event) =>
              onRowChange({
                ...row,
                repeatCount: Number.parseInt(event.target.value, 10),
              })
            }
            value={String(row.repeatCount)}
          >
            {Array.from({ length: 9 }, (_, index) => {
              const value = String(index + 1)

              return (
                <option key={value} value={value}>
                  {value}
                </option>
              )
            })}
          </select>
        </div>
        <div className="md:col-span-2">
          <label
            className="mb-2 block text-sm font-medium text-foreground"
            htmlFor={`sidebar-sequence-end-behavior-${rowIndex}`}
          >
            {t("endBehavior")}
          </label>
          <select
            className="
              block h-10 w-full rounded-md border border-foreground/10
              bg-background px-3 text-sm text-foreground outline-1
              -outline-offset-1 outline-foreground/10
              focus:outline-2 focus:-outline-offset-2 focus:outline-(--step-color)
            "
            id={`sidebar-sequence-end-behavior-${rowIndex}`}
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

      <div>
        <ColorSwatchField
          id={`sidebar-sequence-primary-${rowIndex}`}
          label={t("color")}
          onChange={(event) =>
            onRowChange({
              ...row,
              primaryColor: event.target.value,
            })
          }
          value={row.primaryColor}
        />
      </div>
    </div>
  )
}
