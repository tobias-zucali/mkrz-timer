"use client"

import type { RefObject } from "react"

import useSyncConflictResolution from "@/app/useSyncConflictResolution"
import type { SyncParams } from "@/shared/remoteSession/types"
import debug from "@/utils/debug"
import useRemoteSession from "@/utils/remoteSession"
import { createRemoteSessionError } from "@/utils/remoteSession/lifecycle"
import useParams from "@/utils/useParams"
import type { TimerState } from "@/utils/useTimer"

export default function useTimerPageRemoteSession({
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

  const remoteSession = useRemoteSession({
    getReconnectSnapshot,
    onHandleAction: (action) => {
      if (action.params) {
        paramData.setParams(action.params)
      }
      if (action.state) {
        setState(action.state)
        return
      }

      debug.error("Missing timer state in remote session sync.")
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
    remoteSession,
  }
}
