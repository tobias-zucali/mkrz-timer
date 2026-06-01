import classNames from "classnames"

import { ChevronLeftIcon, ChevronRightIcon } from "@/utils/icons"

type TimerStepButtonProps = {
  ariaLabel: string
  direction: "next" | "previous"
  isDimmed?: boolean
  isHighlighted?: boolean
  onClick: () => void
}

export default function TimerStepButton({
  ariaLabel,
  direction,
  isDimmed = false,
  isHighlighted = false,
  onClick,
}: TimerStepButtonProps) {
  const Icon = direction === "previous" ? ChevronLeftIcon : ChevronRightIcon

  return (
    <button
      aria-label={ariaLabel}
      className={classNames(
        "absolute top-1/2 z-10 inline-flex size-12 -translate-y-1/2",
        "items-center justify-center rounded-full border text-foreground",
        "shadow-lg shadow-background/16 backdrop-blur-sm transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "timer-chrome-transition",
        direction === "previous" ? "left-4" : "right-4",
        isHighlighted
          ? "border-primary bg-primary hover:bg-primary/88"
          : "border-foreground/12 bg-background/72 hover:border-primary/40 hover:text-primary",
        !isHighlighted && isDimmed && "timer-chrome-dimmed",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-6" />
    </button>
  )
}
