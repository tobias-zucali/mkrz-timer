"use client"

import type {
  KeyboardEvent as ReactKeyboardEvent,
  KeyboardEventHandler,
} from "react"

const isSpaceKey = (key: string) =>
  key === " " || key === "Space" || key === "Spacebar"

export function getTimerSpaceShortcutButtonProps<T extends HTMLElement>({
  onKeyDown,
  onKeyUp,
}: {
  onKeyDown?: KeyboardEventHandler<T>
  onKeyUp?: KeyboardEventHandler<T>
} = {}) {
  return {
    onKeyDownCapture: (event: ReactKeyboardEvent<T>) => {
      if (isSpaceKey(event.key) || event.key === "Enter") {
        event.stopPropagation()
        onKeyDown?.(event)
        return
      }

      onKeyDown?.(event)
    },
    onKeyUpCapture: onKeyUp,
  }
}
