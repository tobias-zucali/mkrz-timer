"use client"

import type { RefObject } from "react"

import useSyncConflictResolution from "@/app/liveSession/useSyncConflictResolution"
import type { SyncParams } from "@/shared/liveSession/types"
import debug from "@/utils/debug"
import useLiveSession from "@/utils/liveSession"
import { createRemoteSessionError } from "@/utils/liveSession/lifecycle"
import useParams from "@/utils/useParams"
import type { TimerState } from "@/utils/useTimer"

export default function useTimerPageLiveSession({
  hasRecentlyEndedLiveSession,
  paramData,
  remoteRole,
  remoteToken,
  setState,
  syncParamsRef,
  syncStateRef,
}: {
  hasRecentlyEndedLiveSession: boolean
  paramData: ReturnType<typeof useParams>
  remoteRole: "control" | "readonly" | null
  remoteToken: string | null
  setState: (state: TimerState) => void
  syncParamsRef: RefObject<SyncParams>
  syncStateRef: RefObject<TimerState>
}) {
  const remoteLinkError =
    remoteRole !== null && remoteToken === null
      ? createRemoteSessionError("malformedLinkDetail")
      : null

  const {
    getReconnectSnapshot,
    notifyIncomingSyncConflict,
    resolveIncomingSnapshot,
  } = useSyncConflictResolution({
    applyLocalSnapshot: (snapshot) => {
      paramData.setParams(snapshot.params)
      setState(snapshot.state)
    },
    paramData,
    remoteRole,
    syncParamsRef,
    syncStateRef,
  })

  const liveSession = useLiveSession({
    getReconnectSnapshot,
    onHandleAction: (action) => {
      if (action.params) {
        paramData.setParams(action.params)
      }
      if (action.state) {
        setState(action.state)
        return
      }

      debug.error("Missing timer state in live session sync.")
    },
    onIncomingSyncConflict: notifyIncomingSyncConflict,
    remoteRole:
      remoteLinkError || hasRecentlyEndedLiveSession ? null : remoteRole,
    remoteToken:
      remoteLinkError || hasRecentlyEndedLiveSession ? null : remoteToken,
    resolveIncomingSnapshot,
    syncParamsRef,
    syncStateRef,
  })

  return {
    remoteLinkError,
    liveSession,
  }
}
