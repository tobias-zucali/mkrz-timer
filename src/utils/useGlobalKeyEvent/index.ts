"use client"

import { useEffect, useRef } from "react"

export default function useGlobalKeyEvent(
  eventName: "keydown" | "keyup",
  callback: (event: KeyboardEvent) => void,
) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      callbackRef.current(event)
    }

    window.addEventListener(eventName, listener, false)
    return () => {
      window.removeEventListener(eventName, listener, false)
    }
  }, [eventName])
}
