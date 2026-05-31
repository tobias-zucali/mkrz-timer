"use client"

import { useId } from "react"
import { useTranslations } from "next-intl"

import DigitalDisplay from "@/components/DigitalDisplay"
import Pie from "@/components/Pie"
import TimerControls from "@/components/Timer/TimerControls"
import TimerReadonlyPlaceholder, {
  type ReadonlyPlaceholder,
} from "@/components/Timer/TimerReadonlyPlaceholder"
import TimerSequenceProgress from "@/components/Timer/TimerSequenceProgress"
import TimerTitle from "@/components/TimerTitle"
import type { SyncParams } from "@/shared/remoteSession/types"
import {
  buildTimerReadoutLabel,
  buildTimerStepLabel,
  getTimerReadoutStateLabel,
  type TimerReadoutState,
} from "@/utils/accessibility/timer"
import { ChevronLeftIcon, ChevronRightIcon } from "@/utils/icons"
import useTimer from "@/utils/useTimer"

export default function Timer({
  activeIndex,
  isReadonly = false,
  onSelectSequenceRow,
  readonlyPlaceholder,
  rows,
  title,
  handleChange,
  handleTimeBlur,
  timer,
}: {
  activeIndex: number
  isReadonly?: boolean
  onSelectSequenceRow?: (rowIndex: number) => void
  readonlyPlaceholder?: ReadonlyPlaceholder
  rows: SyncParams["rows"]
  title: string
  handleChange: (key: string, value: string) => void
  handleTimeBlur: () => void
  timer: ReturnType<typeof useTimer>
}) {
  const headingId = useId()
  const t = useTranslations("Timer")
  const {
    minutes,
    seconds,
    isStarted,
    isPaused,
    isTimedOut,
    currentRepeat,
    elapsedPercentage,
    handleAction,
  } = timer
  const activeRow = rows[activeIndex] ?? rows[0]
  const hasMultipleRows = rows.length > 1
  const hasPreviousRow = hasMultipleRows && activeIndex > 0
  const hasNextRow = hasMultipleRows && activeIndex < rows.length - 1
  const highlightNextAction =
    isTimedOut && activeRow?.endBehavior === "stop" && hasNextRow
  const shouldReserveTitleSpace = rows.some(
    (row) => row.title.trim().length > 0,
  )
  let readoutState: TimerReadoutState = "editing"
  if (isReadonly) {
    readoutState = "viewOnly"
  } else if (isTimedOut) {
    readoutState = "finished"
  } else if (isStarted && isPaused) {
    readoutState = "paused"
  } else if (isStarted) {
    readoutState = "running"
  }
  const remainingSeconds =
    Number.parseInt(minutes || "0", 10) * 60 +
    Number.parseInt(seconds || "0", 10)
  const readoutSummary = buildTimerReadoutLabel({
    activeIndex,
    readoutState,
    remainingSeconds,
    rowCount: rows.length,
    stepTitle: activeRow?.title ?? "",
    t,
  })
  const stepSummary = hasMultipleRows
    ? buildTimerStepLabel({
        activeIndex,
        rowCount: rows.length,
        t,
        title: activeRow?.title ?? "",
      })
    : null
  const currentRepeatLabel =
    activeRow && activeRow.repeatCount > 1
      ? t("loop", {
          current: currentRepeat,
          total: activeRow.repeatCount,
        })
      : null
  const stepTitles = rows.map((row, index) => {
    const rowTitle = row.title.trim()
    if (rowTitle) {
      return t("stepTitleWithName", {
        step: index + 1,
        title: rowTitle,
      })
    }

    return t("stepTitleWithoutName", {
      step: index + 1,
    })
  })

  return (
    <section aria-labelledby={headingId} className="flex h-full flex-col">
      <h1 className="sr-only" id={headingId}>
        {title.trim() || t("screenHeading")}
      </h1>
      <TimerTitle
        disabled={isReadonly}
        reserveSpace={shouldReserveTitleSpace}
        value={title}
        onChange={(value) => handleChange("title", value)}
      />
      <div className="relative flex h-[10em] grow items-center justify-center p-[1em]">
        <Pie
          percentage={elapsedPercentage > 1 ? 0 : 100 * (1 - elapsedPercentage)}
        />

        {readonlyPlaceholder ? (
          <TimerReadonlyPlaceholder placeholder={readonlyPlaceholder} />
        ) : (
          <div className="absolute inset-0 flex grow flex-col items-center justify-center">
            {hasPreviousRow && !isReadonly ? (
              <button
                aria-label={t("previousStep")}
                className="
                  absolute top-1/2 left-4 z-10 inline-flex size-12 -translate-y-1/2
                  items-center justify-center rounded-full border
                  border-foreground/12 bg-background/72 text-foreground
                  shadow-lg shadow-background/16 backdrop-blur-sm transition
                  hover:border-primary/40 hover:text-primary
                  focus-visible:outline-2 focus-visible:outline-offset-2
                  focus-visible:outline-primary
                "
                onClick={() => handleAction("previous")}
                type="button"
              >
                <ChevronLeftIcon className="size-6" />
              </button>
            ) : null}
            {hasNextRow && !isReadonly ? (
              <button
                aria-label={t("nextStep")}
                className={
                  highlightNextAction
                    ? `
                        absolute top-1/2 right-4 z-10 inline-flex size-12
                        -translate-y-1/2 items-center justify-center rounded-full
                        border border-primary bg-primary text-foreground
                        shadow-lg shadow-background/16 backdrop-blur-sm transition
                        hover:bg-primary/88 focus-visible:outline-2
                        focus-visible:outline-offset-2 focus-visible:outline-primary
                      `
                    : `
                        absolute top-1/2 right-4 z-10 inline-flex size-12
                        -translate-y-1/2 items-center justify-center rounded-full
                        border border-foreground/12 bg-background/72 text-foreground
                        shadow-lg shadow-background/16 backdrop-blur-sm transition
                        hover:border-primary/40 hover:text-primary
                        focus-visible:outline-2 focus-visible:outline-offset-2
                        focus-visible:outline-primary
                      `
                }
                onClick={() => handleAction("next")}
                type="button"
              >
                <ChevronRightIcon className="size-6" />
              </button>
            ) : null}
            <DigitalDisplay
              accessibleText={readoutSummary}
              data-testid="timer-display"
              displayMode={isReadonly || isStarted ? "readout" : "editable"}
              isAlert={isTimedOut}
              isReadonly={isReadonly || isStarted}
              minutes={minutes}
              onBlur={handleTimeBlur}
              onMinutesChange={(event) => handleChange("m", event.target.value)}
              onSecondsChange={(event) => handleChange("s", event.target.value)}
              seconds={seconds}
            />
            <div className="sr-only" data-testid="timer-readout-summary">
              {readoutSummary}
              {stepSummary ? ` ${stepSummary}.` : ""}
            </div>
            <TimerSequenceProgress
              activeIndex={activeIndex}
              currentRepeatLabel={currentRepeatLabel}
              isReadonly={isReadonly}
              rows={rows}
              stepTitles={stepTitles}
              onSelectSequenceRow={onSelectSequenceRow}
            />
            {!isReadonly && (
              <TimerControls
                isPaused={isPaused}
                isTimedOut={isTimedOut}
                pauseLabel={t("pause")}
                resetLabel={t("reset")}
                startLabel={t("start")}
                stateLabel={getTimerReadoutStateLabel(readoutState, t)}
                onPause={() => handleAction("pause")}
                onReset={() => handleAction("restart")}
                onStart={() => handleAction("start")}
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
}
