"use client"

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from "@/utils/icons"
import type { RemoteRelayReachabilityState } from "@/utils/remoteSession/useRemoteRelayReachability"
import type { SessionPresentationState } from "@/utils/sessionPresentation"

export function getNetworkLabel(isOnline: boolean | null) {
  if (isOnline === null) {
    return "Checking"
  }
  return isOnline ? "Online" : "Offline"
}

export function getRelayReachabilityLabel(
  relayReachability: RemoteRelayReachabilityState,
) {
  switch (relayReachability) {
    case "reachable":
      return "Reachable"
    case "unreachable":
      return "Unreachable"
    case "checking":
      return "Checking"
  }
}

export function getCompactStatusAppearance({
  errorText,
  isOnline,
  relayReachability,
  state,
}: {
  errorText: string | null
  isOnline: boolean | null
  relayReachability: RemoteRelayReachabilityState
  state: SessionPresentationState
}) {
  if (state === "local" && !errorText) {
    return {
      icon: CheckCircleIcon,
      iconClassName: "text-emerald-400/90",
    }
  }

  if (errorText || isOnline === false) {
    return {
      icon: XCircleIcon,
      iconClassName: "text-red-300/90",
    }
  }

  if (state === "local" || state === "liveConnected" || state === "liveEnded") {
    return {
      icon: CheckCircleIcon,
      iconClassName: "text-emerald-400/90",
    }
  }

  if (
    state === "liveConflict" ||
    state === "liveConnecting" ||
    state === "liveOffline" ||
    state === "liveReconnecting" ||
    relayReachability === "unreachable" ||
    relayReachability === "checking"
  ) {
    return {
      icon: ExclamationTriangleIcon,
      iconClassName: "text-amber-300/90",
    }
  }

  return {
    icon: CheckCircleIcon,
    iconClassName: "text-emerald-400/90",
  }
}

export function splitTimelineEntry(entry: string) {
  const separatorIndex = entry.indexOf(" ")
  if (separatorIndex < 0) {
    return {
      detail: entry,
      timestamp: "",
    }
  }

  return {
    detail: entry.slice(separatorIndex + 1),
    timestamp: entry.slice(0, separatorIndex),
  }
}

export function formatRelativeTimestamp(
  timestamp: string,
  now: number,
  locale: string,
) {
  const parsedTime = Date.parse(timestamp)
  if (Number.isNaN(parsedTime)) {
    return timestamp
  }

  const diffSeconds = Math.round((parsedTime - now) / 1000)
  const absoluteDiffSeconds = Math.abs(diffSeconds)
  const relativeTimeFormatter = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
  })

  if (absoluteDiffSeconds < 45) {
    return relativeTimeFormatter.format(0, "second")
  }

  if (absoluteDiffSeconds < 60 * 45) {
    return relativeTimeFormatter.format(Math.round(diffSeconds / 60), "minute")
  }

  if (absoluteDiffSeconds < 60 * 60 * 22) {
    return relativeTimeFormatter.format(Math.round(diffSeconds / 3600), "hour")
  }

  return relativeTimeFormatter.format(
    Math.round(diffSeconds / (3600 * 24)),
    "day",
  )
}
