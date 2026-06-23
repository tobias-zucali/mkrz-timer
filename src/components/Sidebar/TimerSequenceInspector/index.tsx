"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { useTranslations } from "next-intl"

import NumericStepperField from "@/components/NumericStepperField"
import type { SyncParams } from "@/shared/liveSession/types"
import { MAX_TITLE_LENGTH, normalizeTitle } from "@/shared/security/input"
import { buildDurationPartsFromTotalSeconds } from "@/shared/timerSequence"
import ColorSwatchField from "@/utils/ColorSwatchField"
import { ChevronRightIcon } from "@/utils/icons"
import { parseIntSafe } from "@/utils/timeInputHelpers"
import { normalizeTimeParts } from "@/utils/timeInputHelpers"

const selectedFieldClassName =
  "text-center focus:border-(--step-color) focus:outline-(--step-color)"

const clampRepeatCount = (value: number) => Math.min(Math.max(value, 1), 9)

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

  const normalizedTitle = normalizeTitle(row.title)

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

  const stepDurationField = (
    field: "minutes" | "seconds",
    direction: -1 | 1,
  ) => {
    const nextMinutes =
      field === "minutes"
        ? String(parseIntSafe(minutesValue) + direction)
        : minutesValue
    const nextSeconds =
      field === "seconds"
        ? String(parseIntSafe(secondsValue) + direction)
        : secondsValue

    commitDurationChange({
      minutes: nextMinutes,
      seconds: nextSeconds,
    })
  }

  const updateRepeatCount = (nextValue: string | number) => {
    onRowChange({
      ...row,
      repeatCount: clampRepeatCount(parseIntSafe(nextValue)),
    })
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
          className="mb-2 block panel-label text-ink/74"
          htmlFor={`sidebar-sequence-title-${rowIndex}`}
        >
          {t("title")}
        </label>
        <textarea
          className="
            block min-h-0 w-full resize-none overflow-hidden rounded-field border
            border-hairline bg-input-bg px-3 py-2 text-sm/6 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]
            outline-1 -outline-offset-1 outline-transparent
            placeholder:text-ink/42 focus:outline-2
            focus:-outline-offset-2 focus:outline-(--step-color)
          "
          id={`sidebar-sequence-title-${rowIndex}`}
          maxLength={MAX_TITLE_LENGTH}
          onChange={(event) =>
            onRowChange({ ...row, title: normalizeTitle(event.target.value) })
          }
          onKeyDown={(event) => {
            event.stopPropagation()

            if (event.key === "Enter") {
              event.preventDefault()
            }
          }}
          onKeyUp={(event) => event.stopPropagation()}
          onPaste={(event) => {
            event.preventDefault()

            const textarea = event.currentTarget
            const pastedText = normalizeTitle(
              event.clipboardData.getData("text"),
            )
            const selectionStart =
              textarea.selectionStart ?? normalizedTitle.length
            const selectionEnd = textarea.selectionEnd ?? selectionStart

            onRowChange({
              ...row,
              title: normalizeTitle(
                `${normalizedTitle.slice(0, selectionStart)}${pastedText}${normalizedTitle.slice(
                  selectionEnd,
                )}`,
              ),
            })
          }}
          ref={titleTextareaRef}
          rows={1}
          value={normalizedTitle}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumericStepperField
          id={`sidebar-sequence-minutes-${rowIndex}`}
          inputClassName={selectedFieldClassName}
          label={t("minutes")}
          min={0}
          onChange={(event) => {
            const nextMinutes = event.target.value
            setMinutesValue(nextMinutes)
            commitDurationChange({
              minutes: nextMinutes,
              seconds: secondsValue,
            })
          }}
          onStep={(direction) => stepDurationField("minutes", direction)}
          value={minutesValue}
        />
        <NumericStepperField
          id={`sidebar-sequence-seconds-${rowIndex}`}
          inputClassName={selectedFieldClassName}
          label={t("seconds")}
          max={59}
          min={0}
          onChange={(event) => {
            const nextSeconds = event.target.value
            setSecondsValue(nextSeconds)
            commitDurationChange({
              minutes: minutesValue,
              seconds: nextSeconds,
            })
          }}
          onStep={(direction) => stepDurationField("seconds", direction)}
          value={secondsValue}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <NumericStepperField
            id={`sidebar-sequence-repeat-count-${rowIndex}`}
            inputClassName={selectedFieldClassName}
            label={t("repetitions")}
            max={9999999999}
            min={1}
            onChange={(event) => updateRepeatCount(event.target.value)}
            onStep={(direction) =>
              updateRepeatCount(row.repeatCount + direction)
            }
            step={1}
            value={String(row.repeatCount)}
          />
        </div>
        <div className="min-w-0">
          <label
            className="mb-2 block panel-label text-ink/74"
            htmlFor={`sidebar-sequence-end-behavior-${rowIndex}`}
          >
            {t("endBehavior")}
          </label>
          <div
            className="
              relative flex min-h-11 items-center rounded-field border border-hairline
              bg-input-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]
              outline-1 -outline-offset-1 outline-transparent
              focus-within:outline-2 focus-within:-outline-offset-2
              focus-within:outline-(--step-color)
            "
          >
            <select
              className="
                block size-full appearance-none bg-transparent pr-10 pl-3
                font-body text-base font-semibold text-ink outline-none sm:text-sm
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
                <option
                  key={option.value}
                  style={{
                    backgroundColor: "var(--color-input-bg)",
                    color: "var(--color-ink)",
                    fontWeight: 500,
                  }}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
            <span
              aria-hidden="true"
              className="
                pointer-events-none absolute inset-y-0 right-3 flex items-center
                text-ink/54
              "
            >
              <ChevronRightIcon className="size-4 rotate-90" />
            </span>
          </div>
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
