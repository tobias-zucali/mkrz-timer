"use client"

import { useEffect } from "react"

import type { AppLocale } from "@/i18n/config"
import { buildRemotePath } from "@/utils/liveSession/route"
import {
  pauseUrlSyncDuringRemoteRouteTransition,
  setPromotedHostControlClient,
} from "@/utils/timerPage/routeTransition"

export default function usePromoteHostControlRoute({
  accessControlToken,
  hasRecentlyEndedLiveSession,
  locale,
  onLocationReplaced,
  remoteRole,
}: {
  accessControlToken?: string
  hasRecentlyEndedLiveSession: boolean
  locale: AppLocale
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
      locale,
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
    locale,
    onLocationReplaced,
    remoteRole,
  ])
}
