import type { SyncParams } from "@/shared/liveSession/types"
import classNames from "classnames"

type TimerSequenceProgressProps = {
  activeIndex: number
  currentRepeatLabel: string | null
  isDimmed?: boolean
  isReadonly: boolean
  onSelectSequenceRow?: (rowIndex: number) => void
  rows: SyncParams["rows"]
  stepTitles: string[]
}

export default function TimerSequenceProgress({
  activeIndex,
  currentRepeatLabel,
  isDimmed,
  isReadonly,
  onSelectSequenceRow,
  rows,
  stepTitles,
}: TimerSequenceProgressProps) {
  if (rows.length <= 1) {
    return null
  }

  return (
    <div
      className={classNames(
        "pointer-events-none absolute inset-x-0 bottom-[16%] flex justify-center px-6 transition-opacity timer-chrome-transition",
        isDimmed ? "timer-chrome-dimmed" : "opacity-100",
      )}
    >
      <div className="pointer-events-auto flex flex-col items-center gap-3">
        {currentRepeatLabel ? (
          <span className="text-xs font-medium text-ink/52">
            {currentRepeatLabel}
          </span>
        ) : null}
        <div className="flex items-center gap-2">
          {rows.map((_, index) => {
            const isCurrent = index === activeIndex
            const buttonClassName = isCurrent
              ? "h-2.5 w-6 rounded-full bg-ink"
              : "size-2.5 cursor-pointer rounded-full bg-ink/22 hover:bg-ink/42"

            return (
              <button
                aria-label={stepTitles[index]}
                className="-m-3 inline-flex cursor-pointer items-center justify-center p-3"
                disabled={isReadonly}
                key={`step-dot-${index}`}
                onClick={() => onSelectSequenceRow?.(index)}
                title={stepTitles[index]}
                type="button"
              >
                <span aria-hidden="true" className={buttonClassName} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
