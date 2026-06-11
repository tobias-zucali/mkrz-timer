"use client"

import { type ReactNode, useId, useRef } from "react"

import CloseButton from "@/components/CloseButton"
import OverlayBackdrop from "@/components/OverlayBackdrop"
import useDialogFocusTrap from "@/utils/useDialogFocusTrap"

export type ActionDialogAction = {
  label: string
  onClick: () => void
  size?: "default" | "small"
  tone?: "primary" | "secondary"
}

export default function ActionDialog({
  actions,
  children,
  defaultFocusActionIndex = 0,
  description,
  eyebrow,
  onClose,
  role = "dialog",
  size = "small",
  title,
}: {
  actions: ActionDialogAction[]
  children?: ReactNode
  defaultFocusActionIndex?: number
  description: string
  eyebrow?: string
  onClose?: () => void
  role?: "alertdialog" | "dialog"
  size?: "large" | "small"
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
      className="fixed inset-0 isolate z-50"
      role={role}
    >
      <OverlayBackdrop ariaLabel="Close dialog" onClick={onClose} />
      <div
        className="
          pointer-events-none relative z-10 flex size-full items-stretch justify-center p-0
          sm-height:items-center sm-height:p-6
        "
      >
        <div
          className={`
            pointer-events-auto flex max-h-[calc(100vh-2rem)] min-h-0 w-full
            ${size === "large" ? "max-w-2xl" : "max-w-lg"}
            flex-col rounded-3xl border border-foreground/12 bg-background p-6
            shadow-2xl shadow-background/45 sm-height:max-h-[calc(100vh-3rem)]
          `}
          onClick={(event) => event.stopPropagation()}
          ref={dialogRef}
          tabIndex={-1}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
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
              {description ? (
                <p
                  className="mt-3 text-sm/6 text-foreground/68"
                  id={descriptionId}
                >
                  {description}
                </p>
              ) : null}
            </div>
            {onClose ? (
              <CloseButton
                aria-label="Close dialog"
                className="mt-0.5"
                onClick={onClose}
              />
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
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
                      inline-flex cursor-pointer items-center justify-center rounded-xl bg-primary
                      text-sm font-semibold text-background transition
                      hover:bg-primary/85
                      focus:outline-2 focus:-outline-offset-2
                      focus:outline-primary
                      ${action.size === "small" ? "min-h-10 self-end px-5 py-2" : "min-h-11 px-4 py-2.5"}
                    `
                    : `
                      inline-flex cursor-pointer items-center justify-center rounded-xl border
                      border-foreground/12 text-sm font-semibold text-foreground transition
                      hover:bg-foreground/6
                      focus:outline-2 focus:-outline-offset-2
                      focus:outline-primary
                      ${action.size === "small" ? "min-h-10 self-end px-5 py-2" : "min-h-11 px-4 py-2.5"}
                    `
                }
                key={action.label}
                onClick={action.onClick}
                ref={
                  index === defaultFocusActionIndex
                    ? defaultActionRef
                    : undefined
                }
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
