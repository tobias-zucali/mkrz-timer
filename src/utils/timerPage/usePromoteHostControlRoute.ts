"use client"

import { useEffect } from "react"

import { buildRemotePath } from "@/utils/liveSession/route"
import {
  pauseUrlSyncDuringRemoteRouteTransition,
  setPromotedHostControlClient,
} from "@/utils/timerPage/routeTransition"

export default function usePromoteHostControlRoute({
  accessControlToken,
  hasRecentlyEndedLiveSession,
  onLocationReplaced,
  remoteRole,
}: {
  accessControlToken?: string
  hasRecentlyEndedLiveSession: boolean
  onLocationReplaced: () => void
  remoteRole: "control" | "readonly" | null
}) {
  useEffect(() => {
    if (
      remoteRole !== null ||
      !accessControlToken ||
      hasRecentlyEndedLiveSession ||
      typeof window === "undefined"
    ) {
      return
    }

    const controlPath = buildRemotePath({
      role: "control",
      token: accessControlToken,
    })
    if (window.location.pathname === controlPath) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      pauseUrlSyncDuringRemoteRouteTransition()
      setPromotedHostControlClient(true)
      window.history.replaceState(null, "", controlPath)
      onLocationReplaced()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [
    accessControlToken,
    hasRecentlyEndedLiveSession,
    onLocationReplaced,
    remoteRole,
  ])
}
