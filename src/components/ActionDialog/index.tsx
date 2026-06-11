"use client"

import { type ReactNode, useId, useRef } from "react"

import useDialogFocusTrap from "@/utils/useDialogFocusTrap"

export type ActionDialogAction = {
  label: string
  onClick: () => void
  tone?: "primary" | "secondary"
}

export default function ActionDialog({
  actions,
  children,
  defaultFocusActionIndex = 0,
  description,
  eyebrow,
  role = "dialog",
  title,
}: {
  actions: ActionDialogAction[]
  children?: ReactNode
  defaultFocusActionIndex?: number
  description: string
  eyebrow?: string
  role?: "alertdialog" | "dialog"
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
      className="
        fixed inset-0 z-50 flex items-stretch justify-center bg-background/72
        p-0 backdrop-blur-sm sm-height:items-center sm-height:p-6
      "
      role={role}
    >
      <div
        className="
          flex size-full flex-col bg-background p-6
          lg:w-full lg:max-w-lg
          lg:rounded-3xl lg:border lg:border-foreground/12
          lg:shadow-2xl lg:shadow-background/45
          sm-height:h-auto sm-height:max-h-[calc(100vh-3rem)]
        "
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="flex-1 overflow-y-auto">
          {eyebrow ? (
            <p
              className="
                text-xs font-semibold tracking-[0.18em] text-primary/80 uppercase
              "
            >
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
          <p className="mt-3 text-sm/6 text-foreground/68" id={descriptionId}>
            {description}
          </p>
          {children}
        </div>
        <div
          className="
            mt-6 flex flex-col gap-3 border-t border-foreground/8 pt-4
            lg:flex-row lg:justify-end lg:border-t-0
            lg:pt-0
          "
        >
          {actions.map((action, index) => (
            <button
              className={
                action.tone === "primary"
                  ? `
                    inline-flex min-h-11 items-center justify-center rounded-xl
                    bg-primary px-4 py-2.5 text-sm font-semibold text-background
                    transition
                    hover:bg-primary/85
                    focus:outline-2 focus:-outline-offset-2
                    focus:outline-primary
                  `
                  : `
                    inline-flex min-h-11 items-center justify-center rounded-xl
                    border border-foreground/12 px-4 py-2.5 text-sm
                    font-semibold text-foreground transition
                    hover:bg-foreground/6
                    focus:outline-2 focus:-outline-offset-2
                    focus:outline-primary
                  `
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
