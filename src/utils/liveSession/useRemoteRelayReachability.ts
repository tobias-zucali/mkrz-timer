"use client"

import { useEffect, useState } from "react"

import { getRemoteRelayHealthcheckUrl } from "./config"

export type RemoteRelayReachabilityState =
  | "checking"
  | "reachable"
  | "unreachable"

export default function useRemoteRelayReachability(isEnabled: boolean) {
  const [state, setState] = useState<RemoteRelayReachabilityState>("checking")

  useEffect(() => {
    const url = getRemoteRelayHealthcheckUrl()
    if (!isEnabled || !url) {
      return
    }

    let isDisposed = false
    const probe = async () => {
      setState((current) => (current === "reachable" ? current : "checking"))

      try {
        const response = await fetch(url, {
          cache: "no-store",
          method: "GET",
        })

        if (!isDisposed) {
          setState(response.ok ? "reachable" : "unreachable")
        }
      } catch {
        if (!isDisposed) {
          setState("unreachable")
        }
      }
    }

    void probe()
    const intervalId = window.setInterval(() => {
      void probe()
    }, 15_000)

    return () => {
      isDisposed = true
      window.clearInterval(intervalId)
    }
  }, [isEnabled])

  return state
}
