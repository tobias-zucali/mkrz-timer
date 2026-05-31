import type { SyncParams } from "@/shared/remoteSession/types"

type TimerSequenceProgressProps = {
  activeIndex: number
  currentRepeatLabel: string | null
  isReadonly: boolean
  onSelectSequenceRow?: (rowIndex: number) => void
  rows: SyncParams["rows"]
  stepTitles: string[]
}

export default function TimerSequenceProgress({
  activeIndex,
  currentRepeatLabel,
  isReadonly,
  onSelectSequenceRow,
  rows,
  stepTitles,
}: TimerSequenceProgressProps) {
  if (rows.length <= 1) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[16%] flex justify-center px-6">
      <div className="pointer-events-auto flex flex-col items-center gap-3">
        {currentRepeatLabel ? (
          <span className="text-xs font-medium text-foreground/52">
            {currentRepeatLabel}
          </span>
        ) : null}
        <div className="flex items-center gap-2">
          {rows.map((_, index) => {
            const isCurrent = index === activeIndex
            const buttonClassName = isCurrent
              ? "h-2.5 w-6 rounded-full bg-foreground"
              : "size-2.5 cursor-pointer rounded-full bg-foreground/22 hover:bg-foreground/42"

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
