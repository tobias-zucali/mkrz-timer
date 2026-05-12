import { useEffect, useRef, useState } from "react"

export default function useClipboardCopy() {
  const [isClient, setIsClient] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const resetTimeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    setIsClient(true)

    return () => {
      window.clearTimeout(resetTimeoutRef.current)
    }
  }, [])

  const copyText = async (value: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return false
    }

    await navigator.clipboard.writeText(value)
    setIsCopied(true)
    window.clearTimeout(resetTimeoutRef.current)
    resetTimeoutRef.current = window.setTimeout(() => {
      setIsCopied(false)
    }, 2_000)
    return true
  }

  return {
    canCopy:
      isClient &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.clipboard),
    copyText,
    isCopied,
    isClient,
  }
}
