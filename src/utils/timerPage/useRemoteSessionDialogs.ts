"use client"

import type { RefObject } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { getExitConfirmationDialog } from "@/utils/timerPage/dialogs"
import useParams from "@/utils/useParams"
import {
  pauseUrlSyncDuringRemoteRouteTransition,
  setPromotedHostControlClient,
} from "@/utils/timerPage/routeTransition"
import type { SyncParams } from "@/shared/remoteSession/types"
import type { TimerState } from "@/utils/useTimer"

export default function useRemoteSessionDialogs({
  activateLocalFallback,
  disconnect,
  hasRecentlyEndedLiveSession,
  hasOtherConnectedClients,
  hasPendingSyncConflict,
  isControlCapableClient,
  isPromotedHostControlRoute,
  localFallbackReason,
  onLocationReplaced,
  otherParticipantCount,
  paramData,
  remoteRole,
  resolvePendingSyncConflict,
  retryConnection,
  setHasRecentlyEndedLiveSession,
  sessionId,
  setState,
  syncParamsRef,
}: {
  activateLocalFallback: () => Promise<{
    params: SyncParams
    state: TimerState
  }>
  disconnect: () => Promise<void>
  hasRecentlyEndedLiveSession: boolean
  hasOtherConnectedClients: boolean
  hasPendingSyncConflict: boolean
  isControlCapableClient: boolean
  isPromotedHostControlRoute: boolean
  localFallbackReason: string | null
  onLocationReplaced: () => void
  otherParticipantCount: number
  paramData: ReturnType<typeof useParams>
  remoteRole: "control" | "readonly" | null
  resolvePendingSyncConflict: (resolution: "use-local" | "use-server") => void
  retryConnection: () => void
  setHasRecentlyEndedLiveSession: (value: boolean) => void
  sessionId?: string
  setState: (state: TimerState) => void
  syncParamsRef: RefObject<SyncParams>
}) {
  const [isSwitchingToLocalMode, setIsSwitchingToLocalMode] = useState(false)
  const [pendingExitConfirmation, setPendingExitConfirmation] = useState<
    "end-live-session" | "leave-control-client" | null
  >(null)

  const completeEndRemoteSession = useCallback(async () => {
    if (remoteRole === "control") {
      if (typeof window === "undefined") {
        return
      }

      setHasRecentlyEndedLiveSession(true)
      await disconnect()
      pauseUrlSyncDuringRemoteRouteTransition()
      setPromotedHostControlClient(false)
      window.history.replaceState(
        null,
        "",
        paramData.getPathWithParams({
          inherit: false,
          params: syncParamsRef.current,
          pathname: "/",
        }),
      )
      onLocationReplaced()
      return
    }

    if (remoteRole || sessionId) {
      setHasRecentlyEndedLiveSession(true)
      await disconnect()
    }
  }, [
    disconnect,
    onLocationReplaced,
    paramData,
    remoteRole,
    setHasRecentlyEndedLiveSession,
    sessionId,
    syncParamsRef,
  ])

  useEffect(() => {
    if (hasOtherConnectedClients) {
      return
    }

    setPendingExitConfirmation(null)
  }, [hasOtherConnectedClients])

  const handleEndRemoteSession = useCallback(async () => {
    if (hasOtherConnectedClients && isControlCapableClient) {
      setPendingExitConfirmation(
        remoteRole === "control" && !isPromotedHostControlRoute
          ? "leave-control-client"
          : "end-live-session",
      )
      return
    }

    await completeEndRemoteSession()
  }, [
    completeEndRemoteSession,
    hasOtherConnectedClients,
    isControlCapableClient,
    isPromotedHostControlRoute,
    remoteRole,
  ])

  const handleUseLocalMode = useCallback(async () => {
    if (isSwitchingToLocalMode) {
      return
    }

    setIsSwitchingToLocalMode(true)
    try {
      const snapshot = await activateLocalFallback()
      paramData.setParams(snapshot.params)
      setState(snapshot.state)

      if (typeof window === "undefined") {
        return
      }

      setHasRecentlyEndedLiveSession(true)
      pauseUrlSyncDuringRemoteRouteTransition()
      setPromotedHostControlClient(false)
      window.history.replaceState(
        null,
        "",
        paramData.getPathWithParams({
          inherit: false,
          params: snapshot.params,
          pathname: "/",
        }),
      )
      onLocationReplaced()
    } finally {
      setIsSwitchingToLocalMode(false)
    }
  }, [
    activateLocalFallback,
    isSwitchingToLocalMode,
    onLocationReplaced,
    paramData,
    setState,
    setHasRecentlyEndedLiveSession,
  ])

  const recoveryDialog = useMemo(() => {
    if (
      hasRecentlyEndedLiveSession ||
      isSwitchingToLocalMode ||
      (!hasPendingSyncConflict && !localFallbackReason)
    ) {
      return null
    }

    return {
      actions: hasPendingSyncConflict
        ? [
            {
              label: "Use server state",
              onClick: () => resolvePendingSyncConflict("use-server"),
            },
            {
              label: "Push local changes",
              onClick: () => resolvePendingSyncConflict("use-local"),
              tone: "primary" as const,
            },
          ]
        : [
            {
              label: "Retry connection",
              onClick: retryConnection,
            },
            {
              label: "Use local mode",
              onClick: () => {
                void handleUseLocalMode()
              },
              tone: "primary" as const,
            },
          ],
      description: hasPendingSyncConflict
        ? "The live session changed while this client was recovering. Choose whether to keep the fresh server state, push this client's local timer state, or leave the live session and continue locally."
        : localFallbackReason === "invalid-session"
          ? "This live session link is no longer valid. You can retry the connection or continue with the best available local timer state."
          : "The live session could not recover cleanly. Retry the connection or continue with the best available local timer state.",
      title: hasPendingSyncConflict
        ? "Live session state changed during recovery."
        : "Live session recovery needs your decision.",
    }
  }, [
    handleUseLocalMode,
    hasPendingSyncConflict,
    hasRecentlyEndedLiveSession,
    isSwitchingToLocalMode,
    localFallbackReason,
    resolvePendingSyncConflict,
    retryConnection,
  ])

  const exitConfirmationDialog = useMemo(() => {
    if (!pendingExitConfirmation) {
      return null
    }

    return getExitConfirmationDialog({
      completeEndRemoteSession,
      onCancel: () => {
        setPendingExitConfirmation(null)
      },
      otherParticipantCount,
      pendingExitConfirmation,
    })
  }, [completeEndRemoteSession, otherParticipantCount, pendingExitConfirmation])

  return {
    clearRecentlyEndedLiveSession: () => {
      setHasRecentlyEndedLiveSession(false)
    },
    exitConfirmationDialog,
    handleEndRemoteSession,
    recoveryDialog,
  }
}
