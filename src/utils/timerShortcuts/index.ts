"use client"

export type TimerShortcutIntent =
  | "decrease-minute"
  | "increase-minute"
  | "next"
  | "pause"
  | "previous"
  | "reset"
  | "toggle"

const isSpaceKey = (key: string) =>
  key === " " || key === "Space" || key === "Spacebar"

const getHtmlTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement ? target : null

const isEditableTarget = (target: HTMLElement | null) => {
  if (target === null) {
    return false
  }

  return (
    target.closest(
      "input, textarea, select, [contenteditable]:not([contenteditable='false'])",
    ) !== null
  )
}

const isTimerDurationInputTarget = (target: HTMLElement | null) =>
  target?.closest("[data-timer-duration-input='true']") !== null

const isNativeButtonTarget = (target: HTMLElement | null) =>
  target?.closest("button") !== null

export const getTimerShortcutIntent = (
  event: Pick<
    KeyboardEvent,
    "altKey" | "ctrlKey" | "key" | "metaKey" | "repeat" | "target"
  >,
): TimerShortcutIntent | null => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
    return null
  }

  const target = getHtmlTarget(event.target)
  const targetIsEditable = isEditableTarget(target)
  const targetIsDurationInput = isTimerDurationInputTarget(target)

  if (isSpaceKey(event.key)) {
    if (targetIsEditable && !targetIsDurationInput) {
      return null
    }

    return isNativeButtonTarget(target) ? null : "toggle"
  }

  if (event.key === "Enter") {
    if (targetIsEditable && !targetIsDurationInput) {
      return null
    }

    return isNativeButtonTarget(target) ? null : "toggle"
  }

  if (targetIsEditable) {
    return null
  }

  switch (event.key.toLowerCase()) {
    case "arrowdown":
      return "decrease-minute"
    case "arrowleft":
      return "previous"
    case "arrowright":
      return "next"
    case "arrowup":
      return "increase-minute"
    case "escape":
      return "reset"
    case "p":
      return "pause"
    case "r":
      return "reset"
    default:
      return null
  }
}
