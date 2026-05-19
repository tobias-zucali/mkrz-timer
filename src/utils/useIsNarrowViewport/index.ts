"use client"

import { useEffect, useState } from "react"

import { getMaxWidthBelowTailwindScreen } from "@/utils/tailwindTheme"

const maxWidthBelowSmallScreen = getMaxWidthBelowTailwindScreen("sm")

export default function useIsNarrowViewport() {
  const [isNarrowViewport, setIsNarrowViewport] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mediaQuery = window.matchMedia(
      `(max-width: ${maxWidthBelowSmallScreen})`,
    )
    const updateMatch = () => {
      setIsNarrowViewport(mediaQuery.matches)
    }

    updateMatch()
    mediaQuery.addEventListener("change", updateMatch)
    return () => mediaQuery.removeEventListener("change", updateMatch)
  }, [])

  return isNarrowViewport
}
