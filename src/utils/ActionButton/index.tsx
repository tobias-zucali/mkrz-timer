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
        tone === "primary" && "bg-primary text-ink hover:bg-primary-hover",
        tone === "secondary" &&
          "border border-primary/30 bg-ink text-primary hover:border-primary hover:bg-primary hover:text-ink",
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
