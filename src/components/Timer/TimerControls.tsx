import classNames from "classnames"

import { getResponsiveClamp } from "@/utils/responsiveClamp"

const timerButtonClassName =
  "inline-flex appearance-none items-center justify-center rounded-field " +
  "font-display font-semibold tracking-[0.08em] uppercase transition-colors " +
  "focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "cursor-pointer disabled:cursor-default touch-manipulation " +
  "bg-ink/80 text-screen backdrop-blur-sm enabled:hover:bg-ink enabled:hover:text-primary enabled:hover:shadow-xl enabled:hover:shadow-screen/20 enabled:focus-visible:bg-ink enabled:focus-visible:text-primary enabled:focus-visible:shadow-xl enabled:focus-visible:shadow-screen/20 disabled:bg-ink/40 disabled:text-screen/40"

type TimerControlsProps = {
  isDimmed: boolean
  isFinished: boolean
  isPaused: boolean
  isResetDisabled: boolean
  isStartDisabled: boolean
  onPause: () => void
  onReset: () => void
  onStart: () => void
  pauseLabel: string
  resetLabel: string
  startLabel: string
  stateLabel: string
}

export default function TimerControls({
  isDimmed,
  isFinished,
  isPaused,
  isResetDisabled,
  isStartDisabled,
  onPause,
  onReset,
  onStart,
  pauseLabel,
  resetLabel,
  startLabel,
  stateLabel,
}: TimerControlsProps) {
  const timerButtonStyle = {
    fontSize: getResponsiveClamp({
      factor: 4,
      max: 1,
      min: 0.5,
    }),
    minWidth: getResponsiveClamp({
      factor: 9,
      max: 6,
      min: 3.5,
    }),
    paddingBlock: getResponsiveClamp({
      factor: 3,
      max: 0.625,
      min: 0.1,
    }),
    paddingInline: getResponsiveClamp({
      factor: 3,
      max: 0.9,
      min: 0.1,
    }),
    minHeight: "2.75rem",
  }

  return (
    <div
      aria-label={stateLabel}
      className={classNames(
        "flex flex-wrap items-center justify-center gap-1.5 transition-opacity timer-chrome-transition sm:gap-2",
        isDimmed ? "timer-chrome-dimmed" : "opacity-100",
      )}
      data-dimmed={String(isDimmed)}
      data-testid="timer-controls"
    >
      <button
        className={timerButtonClassName}
        disabled={isPaused ? isStartDisabled : isFinished}
        onClick={isPaused ? onStart : onPause}
        style={timerButtonStyle}
        type="button"
      >
        {isPaused ? startLabel : pauseLabel}
      </button>
      <button
        className={timerButtonClassName}
        disabled={isResetDisabled}
        onClick={onReset}
        style={timerButtonStyle}
        type="button"
      >
        {resetLabel}
      </button>
    </div>
  )
}
