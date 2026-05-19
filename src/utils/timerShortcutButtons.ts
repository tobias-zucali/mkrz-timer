"use client"

import type {
  KeyboardEvent as ReactKeyboardEvent,
  KeyboardEventHandler,
} from "react"

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
    onKeyDownCapture: (event: ReactKeyboardEvent<T>) => {
      if (event.key === " ") {
        event.preventDefault()
        event.stopPropagation()
      }

      onKeyDown?.(event)
    },
    onKeyUpCapture: (event: ReactKeyboardEvent<T>) => {
      if (event.key === " ") {
        event.preventDefault()
        event.stopPropagation()
        dispatchTimerSpaceShortcut()
        return
      }

      onKeyUp?.(event)
    },
  }
}
