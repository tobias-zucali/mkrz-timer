"use client"

export function pauseUrlSyncDuringRemoteRouteTransition() {
  if (typeof window === "undefined") {
    return
  }

  ;(
    window as typeof window & { __timerSkipUrlSyncUntil?: number }
  ).__timerSkipUrlSyncUntil = Date.now() + 2_000
}

export function setPromotedHostControlClient(
  isPromotedHostControlClient: boolean,
) {
  if (typeof window === "undefined") {
    return
  }

  ;(
    window as typeof window & {
      __timerPromotedHostControlClient?: boolean
    }
  ).__timerPromotedHostControlClient = isPromotedHostControlClient
}

export function isPromotedHostControlClient() {
  if (typeof window === "undefined") {
    return false
  }

  return Boolean(
    (
      window as typeof window & {
        __timerPromotedHostControlClient?: boolean
      }
    ).__timerPromotedHostControlClient,
  )
}
