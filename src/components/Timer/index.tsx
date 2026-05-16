"use client"

import { useEffect, useState } from "react"

import EditableText from "@/components/EditableText"
import Pie from "@/components/Pie"
import DigitalDisplay from "@/components/DigitalDisplay"
import useTimer from "@/utils/useTimer"

const timerButtonClassName =
  "inline-flex min-h-11 min-w-24 appearance-none items-center justify-center " +
  "rounded-md bg-foreground px-3.5 py-2.5 text-base font-bold text-background " +
  "shadow-sm transition-colors hover:bg-foreground/90 " +
  "focus-visible:outline-secondary focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:cursor-default disabled:opacity-50 disabled:hover:bg-foreground touch-manipulation"

const FAILED_PLACEHOLDER_COPY_DELAY_MS = 2500

export default function Timer({
  isReadonly = false,
  readonlyPlaceholderState,
  title,
  handleChange,
  timer,
}: {
  isReadonly?: boolean
  readonlyPlaceholderState?: "connecting" | "failed" | "reconnecting"
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

  const [showFailedPlaceholderCopy, setShowFailedPlaceholderCopy] =
    useState(false)

  useEffect(() => {
    if (readonlyPlaceholderState !== "failed") {
      setShowFailedPlaceholderCopy(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShowFailedPlaceholderCopy(true)
    }, FAILED_PLACEHOLDER_COPY_DELAY_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [readonlyPlaceholderState])

  const readonlyPlaceholderText =
    readonlyPlaceholderState === "failed" && showFailedPlaceholderCopy
      ? {
          body: "The viewer could not recover the shared timer yet.",
          heading: "Shared timer unavailable",
          eyebrow: "Viewer offline",
        }
      : readonlyPlaceholderState === "reconnecting"
        ? {
            body: "Trying to recover the shared timer and refresh the display.",
            heading: "Reconnecting to shared timer",
            eyebrow: "Reconnecting viewer",
          }
        : {
            body: "Waiting for the host to send the current timer state.",
            heading: "Connecting to shared timer",
            eyebrow: "Connecting viewer",
          }

  return (
    <div className="flex flex-col h-full">
      <EditableText
        data-testid="timer-title"
        disabled={isReadonly}
        value={title}
        onChange={(value) => handleChange("title", value)}
        className={`w-full bg-transparent px-4 pt-1 text-center text-[3em] font-bold md:text-[5em] ${
          isReadonly ? "" : "hover:outline-4 hover:-outline-offset-4"
        }`}
        title={isReadonly ? undefined : "Click to edit title"}
      />
      <div className="flex items-center justify-center grow h-[10em] p-[1em] relative">
        <Pie
          percentage={elapsedPercentage > 1 ? 0 : 100 * (1 - elapsedPercentage)}
        />

        {readonlyPlaceholderState ? (
          <div
            className="absolute inset-0 flex items-center justify-center px-6"
            data-testid="readonly-timer-placeholder"
          >
            <div className="w-full max-w-lg rounded-3xl border border-foreground/12 bg-background/72 px-6 py-8 text-center shadow-xl shadow-background/20 backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                {readonlyPlaceholderText.eyebrow}
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <div className="h-4 w-4 rounded-full bg-primary/80 motion-safe:animate-pulse" />
                <div className="h-4 w-4 rounded-full bg-foreground/30 motion-safe:animate-pulse [animation-delay:150ms]" />
                <div className="h-4 w-4 rounded-full bg-foreground/18 motion-safe:animate-pulse [animation-delay:300ms]" />
              </div>
              <p className="mt-5 text-lg font-semibold text-foreground">
                {readonlyPlaceholderText.heading}
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/68">
                {readonlyPlaceholderText.body}
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
