export type ReadonlyPlaceholder = {
  actionLabel?: string
  body: string
  eyebrow?: string
  heading: string
  onAction?: () => void
  tone: "connecting" | "failed" | "reconnecting"
}

type TimerReadonlyPlaceholderProps = {
  placeholder: ReadonlyPlaceholder
}

export default function TimerReadonlyPlaceholder({
  placeholder,
}: TimerReadonlyPlaceholderProps) {
  const toneClassName =
    placeholder.tone === "failed" ? "bg-primary" : "bg-primary/80"

  return (
    <div
      className="absolute inset-0 flex items-center justify-center px-6"
      data-testid="readonly-timer-placeholder"
    >
      <div
        className="
          w-full max-w-lg rounded-3xl border border-ink/12
          bg-screen/72 px-6 py-8 text-center shadow-xl
          shadow-screen/20 backdrop-blur-sm
        "
      >
        {placeholder.eyebrow ? (
          <p
            className="
              text-xs font-semibold tracking-[0.2em] text-primary/80
              uppercase
            "
          >
            {placeholder.eyebrow}
          </p>
        ) : null}
        <div
          aria-hidden="true"
          className="mt-5 flex items-center justify-center gap-3"
        >
          <div
            className={`size-4 rounded-full motion-safe:animate-pulse ${toneClassName}`}
          />
          <div
            className="
              size-4 rounded-full bg-ink/30
              [animation-delay:150ms] motion-safe:animate-pulse
            "
          />
          <div
            className="
              size-4 rounded-full bg-ink/18
              [animation-delay:300ms] motion-safe:animate-pulse
            "
          />
        </div>
        <p className="mt-5 text-lg font-semibold text-ink">
          {placeholder.heading}
        </p>
        <p className="mt-2 text-sm/6 text-ink/68">{placeholder.body}</p>
        {placeholder.actionLabel && placeholder.onAction ? (
          <button
            className="
              mt-4 cursor-pointer text-sm font-medium text-primary
              underline decoration-primary/60 underline-offset-4
              transition hover:text-primary/82
            "
            onClick={placeholder.onAction}
            type="button"
          >
            {placeholder.actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}
