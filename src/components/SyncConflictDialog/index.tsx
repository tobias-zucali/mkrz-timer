"use client"

export default function SyncConflictDialog({
  onUseLocal,
  onUseServer,
}: {
  onUseLocal: () => void
  onUseServer: () => void
}) {
  return (
    <div
      aria-labelledby="timer-sync-conflict-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/72 p-6 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-3xl border border-foreground/12 bg-background p-6 shadow-2xl shadow-background/45">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
          Sync conflict
        </p>
        <h2
          className="mt-2 text-2xl font-semibold text-foreground"
          id="timer-sync-conflict-title"
        >
          URL state and server state differ.
        </h2>
        <p className="mt-3 text-sm leading-6 text-foreground/68">
          Choose which timer setup should continue before remote sync resumes.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-foreground/12 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-foreground/[0.06] focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
            onClick={onUseServer}
            type="button"
          >
            Use server state
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-background transition hover:bg-primary/85 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
            onClick={onUseLocal}
            type="button"
          >
            Overwrite server using URL params
          </button>
        </div>
      </div>
    </div>
  )
}
