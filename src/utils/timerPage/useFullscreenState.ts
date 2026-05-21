"use client"

import { useEffect, useState } from "react"

export default function useFullscreenState() {
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (typeof document === "undefined") {
      return
    }

    setIsFullscreenSupported(Boolean(document.fullscreenEnabled))
    setIsFullscreen(Boolean(document.fullscreenElement))

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  return {
    isFullscreen,
    isFullscreenSupported,
    toggleFullscreen: () => {
      if (typeof document === "undefined") {
        return
      }

      if (document.fullscreenElement) {
        void document.exitFullscreen()
        return
      }

      void document.documentElement.requestFullscreen()
    },
  }
}
