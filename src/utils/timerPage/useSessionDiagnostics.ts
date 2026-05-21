"use client"

import { useState } from "react"

import {
  getConnectionErrorDetail,
  getReadonlyPlaceholder,
} from "@/utils/timerPage/dialogs"
import type {
  RelayConnectionDetails,
  SyncParams,
} from "@/shared/remoteSession/types"
import buildErrorReportBody from "@/utils/buildErrorReportBody"
import getRemoteStatus from "@/utils/remoteStatus"
import { getRemoteRelayLabel } from "@/utils/remoteSession/config"
import useRemoteRelayReachability from "@/utils/remoteSession/useRemoteRelayReachability"
import getSessionPresentation from "@/utils/sessionPresentation"
import useFloatingTimerPiP from "@/utils/useFloatingTimerPiP"
import useNetworkStatus from "@/utils/useNetworkStatus"

export default function useSessionDiagnostics({
  canRetryManually,
  connectionCount,
  connectionDetails,
  hasConnectedOnce,
  hasPendingSyncConflict,
  hasReceivedInitialSync,
  hasRecentlyEndedLiveSession,
  isHostRemoteSession,
  isReadonlyClient,
  lifecycleState,
  params,
  participants,
  pathname,
  peerEventTimeline,
  remoteError,
  remoteRole,
  remoteStatusEnabled,
  sessionId,
  timerState,
  onOpenStatusPanel,
}: {
  canRetryManually: boolean
  connectionCount: number
  connectionDetails: RelayConnectionDetails[]
  hasConnectedOnce: boolean
  hasPendingSyncConflict: boolean
  hasReceivedInitialSync: boolean
  hasRecentlyEndedLiveSession: boolean
  isHostRemoteSession: boolean
  isReadonlyClient: boolean
  lifecycleState:
    | "connecting"
    | "connected"
    | "failed"
    | "recovered"
    | "reconnecting"
  params: SyncParams
  participants: Array<{ canControl: boolean }>
  pathname: string
  peerEventTimeline: string[]
  remoteError: Error | null
  remoteRole: "control" | "readonly" | null
  remoteStatusEnabled: boolean
  sessionId?: string
  timerState: {
    backgroundColor: string
    elapsedPercentage: number
    foregroundColor: string
    isTimedOut: boolean
    minutes: string
    primaryColor: string
    seconds: string
    title: string
  }
  onOpenStatusPanel: () => void
}) {
  const [floatingTimerErrorText, setFloatingTimerErrorText] = useState<
    string | null
  >(null)

  const isOnline = useNetworkStatus()
  const relayLabel = getRemoteRelayLabel()
  const relayReachability = useRemoteRelayReachability(remoteStatusEnabled)
  const remoteStatusRole = remoteRole === "readonly" ? "readonly" : "control"
  const remoteErrorText = remoteError
    ? remoteStatusEnabled && remoteRole !== null
      ? `Live session link has a connection problem. ${getConnectionErrorDetail(remoteError)}`
      : `Live session could not start. ${getConnectionErrorDetail(remoteError)}`
    : null
  const remoteStatus = getRemoteStatus({
    canRetryManually,
    hasConnectedOnce,
    hasControllingParticipant: participants.some(
      (participant) => participant.canControl,
    ),
    hasReceivedInitialSync,
    isRemoteEnabled: remoteStatusEnabled,
    lifecycleState,
    participantCount: connectionCount,
    role: remoteStatusRole,
    showPendingHostStatus: isHostRemoteSession && !sessionId,
  })
  const sessionPresentation = getSessionPresentation({
    hasPendingSyncConflict,
    hasRecentlyEndedSession: hasRecentlyEndedLiveSession,
    isOnline,
    relayReachability,
    remoteStatus,
  })
  const readonlyPlaceholder = isReadonlyClient
    ? getReadonlyPlaceholder({
        onOpenStatusPanel,
        remoteError,
        sessionPresentation,
      })
    : undefined
  const getErrorReportBody = () =>
    buildErrorReportBody({
      connectionCount,
      connectionDetails,
      error: remoteError,
      errorText: remoteErrorText,
      floatingTimerErrorText,
      hasFocus:
        typeof document !== "undefined" ? document.hasFocus() : "unavailable",
      isOnline: isOnline ?? "unavailable",
      isReadonlyClient,
      params,
      participantRole: remoteStatusRole,
      participantStatus: sessionId ? "connected" : "disconnected",
      peerEventTimeline,
      relayLabel,
      relayReachabilityLabel:
        sessionPresentation.state === "local" ||
        sessionPresentation.state === "liveEnded"
          ? undefined
          : relayReachability === "reachable"
            ? "Reachable"
            : relayReachability === "unreachable"
              ? "Unreachable"
              : "Checking",
      remotePath: pathname,
      sessionId,
      statusDescription: floatingTimerErrorText
        ? "A local feature reported an issue. Review the details below."
        : sessionPresentation.statusPanel.description,
      statusModeLabel: sessionPresentation.statusPanel.sessionLabel,
      statusNetworkLabel:
        isOnline === null ? "Checking" : isOnline ? "Online" : "Offline",
      statusRemoteModeLabel: sessionPresentation.statusPanel.summaryLabel,
      statusSessionLabel:
        sessionPresentation.state === "local" ||
        sessionPresentation.state === "liveEnded"
          ? undefined
          : sessionPresentation.statusPanel.accessLabel,
      statusStateLabel: remoteErrorText
        ? "Error"
        : floatingTimerErrorText
          ? "Attention needed"
          : sessionPresentation.statusPanel.stateLabel,
      visibilityState:
        typeof document !== "undefined"
          ? document.visibilityState
          : "unavailable",
    })
  const floatingTimerData = useFloatingTimerPiP({
    setErrorText: setFloatingTimerErrorText,
    state: timerState,
  })

  return {
    floatingTimerData,
    floatingTimerErrorText,
    getErrorReportBody,
    isOnline,
    readonlyPlaceholder,
    relayLabel,
    relayReachability,
    remoteErrorText,
    sessionPresentation,
  }
}
