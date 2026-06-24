"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { useTranslations } from "next-intl"

import NumericStepperField from "@/components/NumericStepperField"
import SelectField from "@/components/SelectField"
import SegmentedControl from "@/components/SegmentedControl"
import type { SyncParams } from "@/shared/liveSession/types"
import { MAX_TITLE_LENGTH, normalizeTitle } from "@/shared/security/input"
import { buildDurationPartsFromTotalSeconds } from "@/shared/timerSequence"
import ColorSwatchField from "@/utils/ColorSwatchField"
import { parseIntSafe, normalizeTimeParts } from "@/utils/timeInputHelpers"

type SequenceRow = SyncParams["rows"][number]
type RepeatMode = "once" | "times" | "loop"

const selectedFieldClassName =
  "text-center focus:border-(--step-color) focus:outline-(--step-color)"

const clampRepeatCount = (value: number) => Math.min(Math.max(value, 1), 99)

const deriveRepeatMode = (row: SequenceRow): RepeatMode => {
  if (row.endBehavior === "advance") return "loop"
  if (row.repeatCount > 1) return "times"
  return "once"
}

export default function TimerSequenceInspector({
  isSingleStep = false,
  isLastStep = false,
  onRowChange,
  row,
  rowIndex,
}: {
  isSingleStep?: boolean
  isLastStep?: boolean
  onRowChange: (nextRow: SequenceRow) => void
  row: SequenceRow
  rowIndex: number
}) {
  const t = useTranslations("Sidebar.timerSequenceInspector")
  const duration = buildDurationPartsFromTotalSeconds(row.totalSeconds)
  const [minutesValue, setMinutesValue] = useState(duration.m)
  const [secondsValue, setSecondsValue] = useState(duration.s)
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null)

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

    commitDurationChange({ minutes: nextMinutes, seconds: nextSeconds })
  }

  const updateRepeatCount = (nextValue: string | number) => {
    onRowChange({
      ...row,
      repeatCount: clampRepeatCount(parseIntSafe(nextValue)),
    })
  }

  const repeatMode = deriveRepeatMode(row)

  const handleRepeatModeChange = (mode: RepeatMode) => {
    if (mode === "once") {
      onRowChange({ ...row, repeatCount: 1, endBehavior: "stop" })
    } else if (mode === "times") {
      onRowChange({
        ...row,
        repeatCount: Math.max(row.repeatCount, 2),
        endBehavior: "stop",
      })
    } else {
      onRowChange({ ...row, endBehavior: "advance" })
    }
  }

  const repeatModes: RepeatMode[] = ["once", "times", "loop"]
  const repeatModeLabels: Record<RepeatMode, string> = {
    once: t("repeatOnce"),
    times: t("repeatNTimes"),
    loop: t("repeatLoop"),
  }

  const endBehaviorLabel = isLastStep
    ? t("thenLoopSequence")
    : t("thenContinue")

  return (
    <div
      className="mt-4 space-y-4 pt-1"
      style={{ "--step-color": row.primaryColor } as CSSProperties}
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
                `${normalizedTitle.slice(0, selectionStart)}${pastedText}${normalizedTitle.slice(selectionEnd)}`,
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

      {isSingleStep ? (
        <div>
          <p className="mb-2 panel-label text-ink/74">{t("repeat")}</p>
          <SegmentedControl
            activeClassName="bg-(--step-color) text-white"
            label={t("repeat")}
            onChange={handleRepeatModeChange}
            options={repeatModes.map((mode) => ({
              label: repeatModeLabels[mode],
              value: mode,
            }))}
            value={repeatMode}
          />
          {repeatMode === "times" ? (
            <div className="mt-3">
              <NumericStepperField
                id={`sidebar-sequence-repeat-count-${rowIndex}`}
                inputClassName={selectedFieldClassName}
                label={t("repeatCount")}
                max={99}
                min={2}
                onChange={(event) => updateRepeatCount(event.target.value)}
                onStep={(direction) =>
                  updateRepeatCount(row.repeatCount + direction)
                }
                step={1}
                value={String(row.repeatCount)}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <NumericStepperField
              id={`sidebar-sequence-repeat-count-${rowIndex}`}
              inputClassName={selectedFieldClassName}
              label={t("repeatCount")}
              max={99}
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
            <SelectField
              focusOutlineClassName="focus-within:outline-(--step-color)"
              id={`sidebar-sequence-end-behavior-${rowIndex}`}
              label={t("then")}
              onChange={(event) =>
                onRowChange({
                  ...row,
                  endBehavior: event.target.value as SequenceRow["endBehavior"],
                })
              }
              value={row.endBehavior}
            >
              <option
                style={{
                  backgroundColor: "var(--color-input-bg)",
                  color: "var(--color-ink)",
                  fontWeight: 500,
                }}
                value="stop"
              >
                {t("thenStop")}
              </option>
              <option
                style={{
                  backgroundColor: "var(--color-input-bg)",
                  color: "var(--color-ink)",
                  fontWeight: 500,
                }}
                value="advance"
              >
                {endBehaviorLabel}
              </option>
            </SelectField>
          </div>
        </div>
      )}

      <div>
        <ColorSwatchField
          id={`sidebar-sequence-primary-${rowIndex}`}
          label={t("color")}
          onChange={(event) =>
            onRowChange({ ...row, primaryColor: event.target.value })
          }
          value={row.primaryColor}
        />
      </div>
    </div>
  )
}
