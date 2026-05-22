"use client"

import Pie from "@/components/Pie"
import type { SyncParams } from "@/shared/remoteSession/types"
import DigitalDisplay from "@/components/DigitalDisplay"
import TimerTitle from "@/components/TimerTitle"
import { ChevronLeftIcon, ChevronRightIcon } from "@/utils/icons"
import useTimer from "@/utils/useTimer"

const timerButtonClassName =
  "inline-flex min-h-11 min-w-24 appearance-none items-center justify-center " +
  "rounded-md bg-foreground px-3.5 py-2.5 text-base font-bold text-background " +
  "shadow-sm transition-colors hover:bg-foreground/90 " +
  "focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:cursor-default disabled:opacity-50 disabled:hover:bg-foreground touch-manipulation"

type ReadonlyPlaceholder = {
  actionLabel?: string
  body: string
  eyebrow?: string
  heading: string
  onAction?: () => void
  tone: "connecting" | "failed" | "reconnecting"
}

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
  const showProgress = hasMultipleRows
  const highlightNextAction =
    isTimedOut && activeRow?.endBehavior === "stop" && hasNextRow

  const renderProgress = () => {
    if (!showProgress) {
      return null
    }

    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-[16%] flex justify-center px-6">
        <div className="pointer-events-auto flex flex-col items-center gap-3">
          {activeRow && activeRow.repeatCount > 1 ? (
            <span className="text-xs font-medium text-foreground/52">
              Loop {currentRepeat} of {activeRow.repeatCount}
            </span>
          ) : null}
          <div className="flex items-center gap-2">
            {rows.map((row, index) => {
              const isCurrent = index === activeIndex
              const buttonClassName = isCurrent
                ? "h-2.5 w-6 rounded-full bg-foreground"
                : "size-2.5 cursor-pointer rounded-full bg-foreground/22 hover:bg-foreground/42"
              const stepTitle = row.title.trim()
                ? `Step ${index + 1}: ${row.title.trim()}`
                : `Step ${index + 1}`

              return (
                <button
                  aria-label={stepTitle}
                  className="-m-3 inline-flex cursor-pointer items-center justify-center p-3"
                  disabled={isReadonly}
                  key={`step-dot-${index}`}
                  onClick={() => onSelectSequenceRow?.(index)}
                  title={stepTitle}
                  type="button"
                >
                  <span className={buttonClassName} />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <TimerTitle
        disabled={isReadonly}
        value={title}
        onChange={(value) => handleChange("title", value)}
      />
      <div
        className="
        relative flex h-[10em] grow items-center justify-center p-[1em]
      "
      >
        <Pie
          percentage={elapsedPercentage > 1 ? 0 : 100 * (1 - elapsedPercentage)}
        />

        {readonlyPlaceholder ? (
          <div
            className="absolute inset-0 flex items-center justify-center px-6"
            data-testid="readonly-timer-placeholder"
          >
            <div
              className="
              w-full max-w-lg rounded-3xl border border-foreground/12
              bg-background/72 px-6 py-8 text-center shadow-xl
              shadow-background/20 backdrop-blur-sm
            "
            >
              {readonlyPlaceholder.eyebrow ? (
                <p
                  className="
                  text-xs font-semibold tracking-[0.2em] text-primary/80
                  uppercase
                "
                >
                  {readonlyPlaceholder.eyebrow}
                </p>
              ) : null}
              <div className="mt-5 flex items-center justify-center gap-3">
                <div
                  className={`
                    size-4 rounded-full
                    motion-safe:animate-pulse
                    ${
                      readonlyPlaceholder.tone === "failed"
                        ? "bg-primary"
                        : "bg-primary/80"
                    }
                  `}
                />
                <div
                  className="
                  size-4 rounded-full bg-foreground/30 [animation-delay:150ms]
                  motion-safe:animate-pulse
                "
                />
                <div
                  className="
                  size-4 rounded-full bg-foreground/18 [animation-delay:300ms]
                  motion-safe:animate-pulse
                "
                />
              </div>
              <p className="mt-5 text-lg font-semibold text-foreground">
                {readonlyPlaceholder.heading}
              </p>
              <p className="mt-2 text-sm/6 text-foreground/68">
                {readonlyPlaceholder.body}
              </p>
              {readonlyPlaceholder.actionLabel &&
              readonlyPlaceholder.onAction ? (
                <button
                  className="
                    mt-4 cursor-pointer text-sm font-medium text-primary
                    underline decoration-primary/60 underline-offset-4
                    transition
                    hover:text-primary/82
                  "
                  onClick={readonlyPlaceholder.onAction}
                  type="button"
                >
                  {readonlyPlaceholder.actionLabel}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div
            className="
            absolute inset-0 flex grow flex-col items-center justify-center
          "
          >
            {hasPreviousRow && !isReadonly ? (
              <button
                aria-label="Previous step"
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
                aria-label="Next step"
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
              data-testid="timer-display"
              isAlert={isTimedOut}
              isReadonly={isReadonly || isStarted}
              minutes={minutes}
              onBlur={handleTimeBlur}
              seconds={seconds}
              onMinutesChange={(event) => handleChange("m", event.target.value)}
              onSecondsChange={(event) => handleChange("s", event.target.value)}
            />
            {renderProgress()}
            {!isReadonly && (
              <div
                className="
                  flex flex-wrap items-center justify-center gap-2 py-[0.625em]
                "
                data-testid="timer-controls"
              >
                <button
                  className={timerButtonClassName}
                  disabled={isTimedOut}
                  onClick={() => handleAction(isPaused ? "start" : "pause")}
                >
                  {isPaused ? "START" : "PAUSE"}
                </button>
                <button
                  className={timerButtonClassName}
                  onClick={() => handleAction("restart")}
                >
                  RESET
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
