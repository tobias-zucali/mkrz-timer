"use client"

import { useId, useRef } from "react"

import useDialogFocusTrap from "@/utils/useDialogFocusTrap"

export type ActionDialogAction = {
  label: string
  onClick: () => void
  tone?: "primary" | "secondary"
}

export default function ActionDialog({
  actions,
  defaultFocusActionIndex = 0,
  description,
  eyebrow,
  title,
}: {
  actions: ActionDialogAction[]
  defaultFocusActionIndex?: number
  description: string
  eyebrow?: string
  title: string
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const defaultActionRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useDialogFocusTrap({
    active: true,
    defaultFocusRef: defaultActionRef,
    dialogRef,
  })

  return (
    <div
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/72 p-6 backdrop-blur-sm"
      role="dialog"
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-foreground/12 bg-background p-6 shadow-2xl shadow-background/45"
        ref={dialogRef}
        tabIndex={-1}
      >
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={
            eyebrow
              ? "mt-2 text-2xl font-semibold text-foreground"
              : "text-2xl font-semibold text-foreground"
          }
          id={titleId}
        >
          {title}
        </h2>
        <p
          className="mt-3 text-sm leading-6 text-foreground/68"
          id={descriptionId}
        >
          {description}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {actions.map((action, index) => (
            <button
              className={
                action.tone === "primary"
                  ? "inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-background transition hover:bg-primary/85 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                  : "inline-flex min-h-11 items-center justify-center rounded-xl border border-foreground/12 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-foreground/[0.06] focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
              }
              key={action.label}
              onClick={action.onClick}
              ref={
                index === defaultFocusActionIndex ? defaultActionRef : undefined
              }
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
