import { getResponsiveClamp } from "@/utils/responsiveClamp"

const timerButtonClassName =
  "inline-flex appearance-none items-center justify-center " +
  "rounded-md bg-foreground/80 text-background " +
  "text-background " +
  "bg-foreground font-bold text-background " +
  "shadow-sm transition-colors hover:bg-foreground " +
  "focus-visible:outline-primary focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "cursor-pointer disabled:cursor-default disabled:opacity-50 disabled:hover:bg-foreground/80 touch-manipulation"

type TimerControlsProps = {
  isPaused: boolean
  isTimedOut: boolean
  onPause: () => void
  onReset: () => void
  onStart: () => void
  pauseLabel: string
  resetLabel: string
  startLabel: string
  stateLabel: string
}

export default function TimerControls({
  isPaused,
  isTimedOut,
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
  }

  return (
    <div
      aria-label={stateLabel}
      className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
      data-testid="timer-controls"
    >
      <button
        className={timerButtonClassName}
        disabled={isTimedOut}
        onClick={isPaused ? onStart : onPause}
        style={timerButtonStyle}
        type="button"
      >
        {isPaused ? startLabel : pauseLabel}
      </button>
      <button
        className={timerButtonClassName}
        onClick={onReset}
        style={timerButtonStyle}
        type="button"
      >
        {resetLabel}
      </button>
    </div>
  )
}
