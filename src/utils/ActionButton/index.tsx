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
        "inline-flex items-center justify-center gap-2 rounded-xl font-display text-sm font-semibold tracking-[0.06em] transition enabled:cursor-pointer",
        "focus:outline-2 focus:-outline-offset-2 focus:outline-primary disabled:opacity-50",
        compact ? "min-h-9 px-3 py-2" : "min-h-11 px-4 py-2.5",
        tone === "primary" && "bg-primary text-white hover:bg-primary-hover",
        tone === "secondary" &&
          "border border-hairline bg-card text-ink hover:border-primary/35 hover:bg-primary/6",
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
