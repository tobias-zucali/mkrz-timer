import { useEffect } from "react"

export default function useDebouncedEffect(
  effect: () => void,
  delayMs: number,
) {
  useEffect(() => {
    const timeoutId = window.setTimeout(effect, delayMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [delayMs, effect])
}
