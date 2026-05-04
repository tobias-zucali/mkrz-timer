"use client"

import EditableHtml from "@/components/EditableHtml"
import Pie from "@/components/Pie"
import DigitalDisplay from "@/components/DigitalDisplay"
import useTimer from "@/utils/useTimer"

const timerButtonClassName =
  "inline-flex min-h-11 min-w-24 appearance-none items-center justify-center " +
  "rounded-md bg-foreground px-3.5 py-2.5 text-base font-bold text-background " +
  "shadow-sm transition-colors hover:bg-foreground/90 " +
  "focus-visible:outline-secondary focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:cursor-default disabled:opacity-50 disabled:hover:bg-foreground touch-manipulation"

export default function Timer({
  isReadonly = false,
  title,
  handleChange,
  timer,
}: {
  isReadonly?: boolean
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
      <EditableHtml
        disabled={isReadonly}
        html={title}
        onChange={(value) => handleChange("title", value)}
        className={`text-center text-[3em] font-bold pt-1 md:text-[5em] rouded-lg ${
          isReadonly ? "" : "hover:outline-4 hover:-outline-offset-4"
        }`}
        title={isReadonly ? undefined : "Click to edit title"}
      />
      <div className="flex items-center justify-center grow h-[10em] p-[1em] relative">
        <Pie
          percentage={elapsedPercentage > 1 ? 0 : 100 * (1 - elapsedPercentage)}
        />

        <div className="flex flex-col items-center justify-center grow absolute inset-0">
          <DigitalDisplay
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
                onClick={() => handleAction("toggle")}
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
      </div>
    </div>
  )
}
