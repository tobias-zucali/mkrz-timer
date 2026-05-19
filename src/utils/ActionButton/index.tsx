"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react"

import classNames from "classnames"

import { getTimerSpaceShortcutButtonProps } from "@/utils/timerShortcutButtons"

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  fullWidth?: boolean
  children: ReactNode
}

export default function ActionButton({
  children,
  className,
  fullWidth = false,
  onClick,
  type = "button",
  ...otherProps
}: ActionButtonProps) {
  return (
    <button
      className={classNames(
        "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-primary/90 focus:outline-2 focus:-outline-offset-2 focus:outline-primary disabled:cursor-not-allowed disabled:opacity-50",
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
