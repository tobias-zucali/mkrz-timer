"use client"

import { useEffect, useRef } from "react"

export default function useGlobalKeyUp(
  callback: (event: KeyboardEvent) => void,
) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const onKeyUp = (event: KeyboardEvent) => {
      // We must not call callback() directly as it would not update
      callbackRef.current(event)
    }
    window.addEventListener("keyup", onKeyUp, false)
    return () => {
      window.removeEventListener("keyup", onKeyUp, false)
    }
  }, [])
}
