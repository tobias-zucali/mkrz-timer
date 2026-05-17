"use client"

import { useEffect } from "react"

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ")

const getFocusableElements = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true",
  )

export default function useDialogFocusTrap({
  active,
  defaultFocusRef,
  dialogRef,
}: {
  active: boolean
  defaultFocusRef?: React.RefObject<HTMLElement | null>
  dialogRef: React.RefObject<HTMLElement | null>
}) {
  useEffect(() => {
    if (!active) {
      return
    }

    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const focusDefaultElement = () => {
      const preferredElement = defaultFocusRef?.current
      if (preferredElement && dialog.contains(preferredElement)) {
        preferredElement.focus()
        return
      }

      const [firstFocusableElement] = getFocusableElements(dialog)
      if (firstFocusableElement) {
        firstFocusableElement.focus()
        return
      }

      dialog.focus()
    }

    const frameId = window.requestAnimationFrame(focusDefaultElement)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") {
        return
      }

      const focusableElements = getFocusableElements(dialog)
      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const firstFocusableElement = focusableElements[0]
      const lastFocusableElement =
        focusableElements[focusableElements.length - 1]
      const activeElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null

      if (!activeElement || !dialog.contains(activeElement)) {
        event.preventDefault()
        firstFocusableElement.focus()
        return
      }

      if (event.shiftKey && activeElement === firstFocusableElement) {
        event.preventDefault()
        lastFocusableElement.focus()
        return
      }

      if (!event.shiftKey && activeElement === lastFocusableElement) {
        event.preventDefault()
        firstFocusableElement.focus()
      }
    }

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && !dialog.contains(target)) {
        focusDefaultElement()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    document.addEventListener("focusin", handleFocusIn)

    return () => {
      window.cancelAnimationFrame(frameId)
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("focusin", handleFocusIn)
      previouslyFocusedElement?.focus()
    }
  }, [active, defaultFocusRef, dialogRef])
}
