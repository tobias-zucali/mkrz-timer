"use client"

import type {
  KeyboardEvent as ReactKeyboardEvent,
  KeyboardEventHandler,
} from "react"

const isSpaceKey = (key: string) =>
  key === " " || key === "Space" || key === "Spacebar"

function dispatchTimerSpaceShortcut() {
  if (typeof window === "undefined") {
    return
  }

  ;(
    window as typeof window & { __timerSpaceShortcutConsumed?: boolean }
  ).__timerSpaceShortcutConsumed = true
  window.dispatchEvent(new CustomEvent("timer-space-shortcut"))
}

export function getTimerSpaceShortcutButtonProps<T extends HTMLElement>({
  onKeyDown,
  onKeyUp,
}: {
  onKeyDown?: KeyboardEventHandler<T>
  onKeyUp?: KeyboardEventHandler<T>
} = {}) {
  return {
    "data-timer-space-shortcut": "true",
    onKeyDownCapture: (event: ReactKeyboardEvent<T>) => {
      if (isSpaceKey(event.key)) {
        event.preventDefault()
        event.stopPropagation()
        dispatchTimerSpaceShortcut()
        return
      }

      onKeyDown?.(event)
    },
    onKeyUpCapture: (event: ReactKeyboardEvent<T>) => {
      if (isSpaceKey(event.key)) {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      onKeyUp?.(event)
    },
  }
}
