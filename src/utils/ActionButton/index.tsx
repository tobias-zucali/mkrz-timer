"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react"

import classNames from "classnames"

import { getTimerSpaceShortcutButtonProps } from "@/utils/timerShortcutButtons"

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  fullWidth?: boolean
  children: ReactNode
  tone?: "primary" | "secondary"
  compact?: boolean
}

export default function ActionButton({
  children,
  className,
  compact = false,
  fullWidth = false,
  onClick,
  tone = "primary",
  type = "button",
  ...otherProps
}: ActionButtonProps) {
  return (
    <button
      className={classNames(
        "inline-flex enabled:cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-semibold transition focus:outline-2 focus:-outline-offset-2 focus:outline-primary disabled:opacity-50",
        compact ? "min-h-9 px-3 py-2" : "min-h-11 px-4 py-2.5",
        tone === "primary" && "bg-primary text-ink hover:bg-primary/90",
        tone === "secondary" && "border border-ink/12 text-ink hover:bg-ink/6",
        fullWidth && "w-full",
        className,
      )}
      onClick={onClick}
      {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
      type={type}
      {...otherProps}
    >
      {children}
    </button>
  )
}
