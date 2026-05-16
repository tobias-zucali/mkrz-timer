"use client"

import Pie from "@/components/Pie"
import DigitalDisplay from "@/components/DigitalDisplay"
import TimerTitle from "@/components/TimerTitle"
import useTimer from "@/utils/useTimer"

const timerButtonClassName =
  "inline-flex min-h-11 min-w-24 appearance-none items-center justify-center " +
  "rounded-md bg-foreground px-3.5 py-2.5 text-base font-bold text-background " +
  "shadow-sm transition-colors hover:bg-foreground/90 " +
  "focus-visible:outline-secondary focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:cursor-default disabled:opacity-50 disabled:hover:bg-foreground touch-manipulation"

type ReadonlyPlaceholder = {
  body: string
  eyebrow: string
  heading: string
  tone: "connecting" | "failed" | "reconnecting"
}

export default function Timer({
  isReadonly = false,
  readonlyPlaceholder,
  title,
  handleChange,
  timer,
}: {
  isReadonly?: boolean
  readonlyPlaceholder?: ReadonlyPlaceholder
  title: string
  handleChange: (key: string, value: string) => void
  timer: ReturnType<typeof useTimer>
}) {
  const {
    minutes,
    seconds,
    isStarted,
    isPaused,
    isTimedOut,
    elapsedPercentage,
    handleAction,
  } = timer

  return (
    <div className="flex flex-col h-full">
      <TimerTitle
        disabled={isReadonly}
        value={title}
        onChange={(value) => handleChange("title", value)}
      />
      <div className="flex items-center justify-center grow h-[10em] p-[1em] relative">
        <Pie
          percentage={elapsedPercentage > 1 ? 0 : 100 * (1 - elapsedPercentage)}
        />

        {readonlyPlaceholder ? (
          <div
            className="absolute inset-0 flex items-center justify-center px-6"
            data-testid="readonly-timer-placeholder"
          >
            <div className="w-full max-w-lg rounded-3xl border border-foreground/12 bg-background/72 px-6 py-8 text-center shadow-xl shadow-background/20 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                {readonlyPlaceholder.eyebrow}
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <div
                  className={`h-4 w-4 rounded-full motion-safe:animate-pulse ${
                    readonlyPlaceholder.tone === "failed"
                      ? "bg-primary"
                      : "bg-primary/80"
                  }`}
                />
                <div className="h-4 w-4 rounded-full bg-foreground/30 motion-safe:animate-pulse [animation-delay:150ms]" />
                <div className="h-4 w-4 rounded-full bg-foreground/18 motion-safe:animate-pulse [animation-delay:300ms]" />
              </div>
              <p className="mt-5 text-lg font-semibold text-foreground">
                {readonlyPlaceholder.heading}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/68">
                {readonlyPlaceholder.body}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center grow absolute inset-0">
            <DigitalDisplay
              data-testid="timer-display"
              isAlert={isTimedOut}
              isReadonly={isReadonly || isStarted}
              minutes={minutes}
              seconds={seconds}
              onMinutesChange={(event) => handleChange("m", event.target.value)}
              onSecondsChange={(event) => handleChange("s", event.target.value)}
            />
            {!isReadonly && (
              <div
                className="flex flex-wrap items-center justify-center gap-2 py-[0.625em]"
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
                  disabled={!isStarted}
                  onClick={() => handleAction("reset")}
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
