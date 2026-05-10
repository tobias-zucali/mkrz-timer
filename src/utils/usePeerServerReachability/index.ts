import { useEffect, useState } from "react"

import { getPeerServerReachabilityUrl } from "@/utils/peerServerConfig"

export type PeerServerReachabilityState =
  | "checking"
  | "reachable"
  | "unreachable"
  | "managed"

export default function usePeerServerReachability(isEnabled: boolean) {
  const [state, setState] = useState<PeerServerReachabilityState>(() =>
    getPeerServerReachabilityUrl() ? "checking" : "managed",
  )

  useEffect(() => {
    const url = getPeerServerReachabilityUrl()
    if (!isEnabled) {
      return
    }
    if (!url) {
      setState("managed")
      return
    }

    let isDisposed = false
    const probe = async () => {
      setState((current) => (current === "reachable" ? current : "checking"))

      try {
        await fetch(url, {
          cache: "no-store",
          method: "GET",
          mode: "no-cors",
        })
        if (!isDisposed) {
          setState("reachable")
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
    }, 15000)

    return () => {
      isDisposed = true
      if (intervalId !== undefined) {
        window.clearInterval(intervalId)
      }
    }
  }, [isEnabled])

  return state
}
