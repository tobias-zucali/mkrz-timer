"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import type { AppTranslationFn } from "@/i18n/translator"
import {
  getConnectionErrorDetail,
  getReadonlyPlaceholder,
} from "@/utils/timerPage/dialogs"
import type {
  RelayConnectionDetails,
  SyncParams,
} from "@/shared/liveSession/types"
import buildErrorReportBody from "@/utils/buildErrorReportBody"
import getLiveSessionStatus from "@/utils/liveSessionStatus"
import { getRemoteRelayLabel } from "@/utils/liveSession/config"
import useRemoteRelayReachability from "@/utils/liveSession/useRemoteRelayReachability"
import getSessionPresentation from "@/utils/sessionPresentation"
import { shouldDisplayRemoteError } from "@/utils/timerPage/remoteErrorVisibility"
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
  remoteLinkError,
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
  remoteLinkError: Error | null
  remoteRole: "control" | "readonly" | null
  remoteStatusEnabled: boolean
  sessionId?: string
  timerState: {
    elapsedPercentage: number
    isFinished: boolean
    minutes: string
    primaryColor: string
    seconds: string
    title: string
  }
  onOpenStatusPanel: () => void
}) {
  const t = useTranslations()
  const tDialogs = useTranslations("TimerPage.dialogs")
  const tStatusBadge = useTranslations("StatusBadge")
  const tStatusPanel = useTranslations("Sidebar.status")
  const [floatingTimerErrorText, setFloatingTimerErrorText] = useState<
    string | null
  >(null)

  const isOnline = useNetworkStatus()
  const relayLabel = getRemoteRelayLabel()
  const relayReachability = useRemoteRelayReachability(remoteStatusEnabled)
  const remoteStatusRole = remoteRole === "readonly" ? "readonly" : "control"
  const rawRemoteErrorText = remoteError
    ? remoteStatusEnabled && remoteRole !== null
      ? tDialogs("connectionProblem", {
          detail: getConnectionErrorDetail(
            remoteError,
            tDialogs as AppTranslationFn,
          ),
        })
      : tDialogs("startProblem", {
          detail: getConnectionErrorDetail(
            remoteError,
            tDialogs as AppTranslationFn,
          ),
        })
    : null
  const remoteStatus = getLiveSessionStatus({
    canRetryManually,
    hasConnectedOnce,
    hasControllingParticipant: participants.some(
      (participant) => participant.canControl,
    ),
    hasReceivedInitialSync,
    isRemoteEnabled: remoteStatusEnabled,
    lifecycleState: remoteLinkError ? "failed" : lifecycleState,
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
    t: t as AppTranslationFn,
  })
  const remoteErrorText = shouldDisplayRemoteError(sessionPresentation.state)
    ? rawRemoteErrorText
    : null
  const readonlyPlaceholder = isReadonlyClient
    ? getReadonlyPlaceholder({
        onOpenStatusPanel,
        remoteError,
        sessionPresentation,
        t: tDialogs as AppTranslationFn,
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
            ? tStatusPanel("relayReachable")
            : relayReachability === "unreachable"
              ? tStatusPanel("relayUnreachable")
              : tStatusPanel("networkChecking"),
      remotePath: pathname,
      sessionId,
      statusDescription: floatingTimerErrorText
        ? tStatusPanel("localFeatureIssue")
        : sessionPresentation.statusPanel.description,
      statusModeLabel: sessionPresentation.statusPanel.sessionLabel,
      statusNetworkLabel:
        isOnline === null
          ? tStatusPanel("networkChecking")
          : isOnline
            ? tStatusPanel("networkOnline")
            : tStatusPanel("networkOffline"),
      statusRemoteModeLabel: sessionPresentation.statusPanel.summaryLabel,
      statusSessionLabel:
        sessionPresentation.state === "local" ||
        sessionPresentation.state === "liveEnded"
          ? undefined
          : sessionPresentation.statusPanel.accessLabel,
      statusStateLabel: remoteErrorText
        ? tStatusBadge("error")
        : floatingTimerErrorText
          ? tStatusBadge("attentionNeeded")
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
