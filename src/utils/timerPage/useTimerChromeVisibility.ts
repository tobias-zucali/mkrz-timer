"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const CONTROLS_IDLE_TIMEOUT_MS = 5_000
const FOCUS_LOCK_SELECTOR = '[data-timer-chrome-focus-lock="true"]'

function isFocusInsideTimerChrome() {
  if (typeof document === "undefined") {
    return false
  }

  const activeElement = document.activeElement
  return activeElement instanceof HTMLElement
    ? activeElement.closest(FOCUS_LOCK_SELECTOR) !== null
    : false
}

export default function useTimerChromeVisibility() {
  const [isControlsActive, setIsControlsActive] = useState(true)
  const timeoutIdRef = useRef<number | null>(null)

  const clearIdleTimeout = useCallback(() => {
    if (timeoutIdRef.current !== null) {
      window.clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = null
    }
  }, [])

  const scheduleIdleTimeout = useCallback(() => {
    const schedule = () => {
      clearIdleTimeout()

      timeoutIdRef.current = window.setTimeout(() => {
        if (isFocusInsideTimerChrome()) {
          schedule()
          return
        }

        setIsControlsActive(false)
      }, CONTROLS_IDLE_TIMEOUT_MS)
    }

    schedule()
  }, [clearIdleTimeout])

  const activateControls = useCallback(() => {
    setIsControlsActive(true)
    scheduleIdleTimeout()
  }, [scheduleIdleTimeout])

  useEffect(() => {
    if (typeof document === "undefined") {
      return
    }

    scheduleIdleTimeout()

    const handleInteraction = () => {
      activateControls()
    }

    document.addEventListener("pointermove", handleInteraction, {
      passive: true,
    })
    document.addEventListener("pointerdown", handleInteraction, {
      passive: true,
    })
    document.addEventListener("touchstart", handleInteraction, {
      passive: true,
    })
    document.addEventListener("keydown", handleInteraction)
    document.addEventListener("focusin", handleInteraction)

    return () => {
      clearIdleTimeout()
      document.removeEventListener("pointermove", handleInteraction)
      document.removeEventListener("pointerdown", handleInteraction)
      document.removeEventListener("touchstart", handleInteraction)
      document.removeEventListener("keydown", handleInteraction)
      document.removeEventListener("focusin", handleInteraction)
    }
  }, [activateControls, clearIdleTimeout, scheduleIdleTimeout])

  return {
    isControlsActive,
  }
}
