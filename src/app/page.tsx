"use client"
import { Suspense, useEffect, useRef, useState } from "react"

import debug from "@/utils/debug"
import buildErrorReportBody from "@/utils/buildErrorReportBody"
import useFloatingTimerPiP from "@/utils/useFloatingTimerPiP"
import useParams from "@/utils/useParams"
import useRemoteSession from "@/utils/remoteSession"
import { getRemoteRelayLabel } from "@/utils/remoteSession/config"
import useRemoteRelayReachability from "@/utils/remoteSession/useRemoteRelayReachability"
import type { SyncParams } from "@/shared/remoteSession/types"
import getRemoteStatus from "@/utils/remoteStatus"
import type { RemoteStatusState } from "@/utils/remoteStatus"
import useNetworkStatus from "@/utils/useNetworkStatus"
import useTimer, { TimerState } from "@/utils/useTimer"

import Settings from "@/components/Settings"
import SettingsButton from "@/components/SettingsButton"
import StatusPopover from "@/components/StatusPopover"
import Timer from "@/components/Timer"

function getConnectionErrorDetail(error: Error) {
  const detail = error.message.trim()
  return detail || "An unknown error was caught."
}

function getNetworkLabel(isOnline: boolean | null) {
  if (isOnline === null) {
    return "Checking"
  }

  return isOnline ? "Online" : "Offline"
}

function getRelayReachabilityLabel(
  relayReachability: "checking" | "reachable" | "unreachable",
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

export default function App() {
  return (
    <Suspense fallback={null}>
      <TimerApp />
    </Suspense>
  )
}

function TimerApp() {
  const syncStateRef = useRef<TimerState>({} as TimerState)

  const paramData = useParams()
  const { params, setParams } = paramData

  const { title, rid: remoteIdParam, bg, fg, pc, m, s, control } = params

  const syncParams = {
    title,
    bg,
    fg,
    pc,
    m,
    s,
  }

  const syncParamsRef = useRef<SyncParams>(syncParams)
  syncParamsRef.current = syncParams

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const closeSettings = () => setIsSettingsOpen(false)
  const openSettings = () => setIsSettingsOpen(true)

  const [syncState, setSyncState] = useState<TimerState>({} as TimerState)

  const timer = useTimer({
    params: syncParams,
    syncStateRef,
    shortcutsEnabled: !isSettingsOpen,
    onAction: (_action, state) => {
      setSyncState(state)
    },
  })
  const { setState } = timer
  const { minutes, seconds, isTimedOut, elapsedPercentage } = timer

  const remoteSession = useRemoteSession({
    canControlSession: control === "42",
    remoteIdParam,
    syncParamsRef,
    syncStateRef,
    onHandleAction: (action) => {
      if (action.params) {
        setParams(action.params)
      }
      if (action.state) {
        setState(action.state)
      } else {
        debug.error("Missing timer state in remote session sync.")
      }
    },
  })

  const {
    canRetryManually,
    connectionCount,
    connectionDetails,
    error,
    hasConnectedOnce,
    hasReceivedInitialSync,
    isConnecting,
    lifecycleState,
    peerEventTimeline,
    retryConnection,
    sessionId,
    syncAll,
  } = remoteSession

  const handleChange = (key: string, value: string) => {
    syncParamsRef.current = {
      ...syncParamsRef.current,
      [key]: value,
    }
    setParams({ [key]: value })
    syncAll({ keys: [key] })
  }

  const isPendingRemoteStatus =
    Boolean(control === "42") &&
    !remoteIdParam &&
    (isConnecting || Boolean(error))

  useEffect(() => {
    syncAll({ includeParams: false, state: syncState })
  }, [syncAll, syncState])

  const remoteErrorText = error
    ? remoteIdParam || sessionId
      ? `Remote mode has a connection problem. ${getConnectionErrorDetail(error)}`
      : `Remote mode could not start. ${getConnectionErrorDetail(error)}`
    : null
  const [floatingTimerErrorText, setFloatingTimerErrorText] = useState<
    string | null
  >(null)

  useEffect(() => {
    if (!isSettingsOpen) {
      return
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSettings()
      }
    }

    window.addEventListener("keyup", onKeyUp, false)
    return () => {
      window.removeEventListener("keyup", onKeyUp, false)
    }
  }, [isSettingsOpen])

  const isReadonlyClient = Boolean(remoteIdParam && control !== "42")
  const isOnline = useNetworkStatus()
  const relayLabel = getRemoteRelayLabel()
  const relayReachability = useRemoteRelayReachability(
    Boolean(remoteIdParam || sessionId),
  )
  const remoteStatus = getRemoteStatus({
    canRetryManually,
    control,
    hasConnectedOnce,
    hasReceivedInitialSync,
    lifecycleState,
    participantCount: connectionCount,
    remoteIdParam: remoteIdParam || sessionId,
    showPendingHostStatus: isPendingRemoteStatus,
  })

  useEffect(() => {
    if (!sessionId || !hasConnectedOnce || remoteIdParam || control === "42") {
      return
    }

    setParams({
      control: "42",
      rid: sessionId,
    })
  }, [control, hasConnectedOnce, remoteIdParam, sessionId, setParams])
  const readonlyPlaceholderStateByRemoteState: Partial<
    Record<RemoteStatusState, "connecting" | "failed" | "reconnecting">
  > = {
    connecting: "connecting",
    failed: "failed",
    reconnecting: "reconnecting",
  }
  const readonlyPlaceholderState =
    isReadonlyClient && remoteStatus
      ? readonlyPlaceholderStateByRemoteState[remoteStatus.state]
      : undefined
  const statusModeLabel = remoteStatus?.roleLabel ?? "Local timer"
  const statusStateLabel = remoteErrorText
    ? (remoteStatus?.stateLabel ?? "Attention needed")
    : floatingTimerErrorText
      ? "Attention needed"
      : (remoteStatus?.stateLabel ?? "Ready")
  const statusDescription = remoteStatus
    ? remoteStatus.description
    : floatingTimerErrorText
      ? "A local feature reported an issue. Review the details below."
      : "Remote mode is off. Open settings when you want to share the timer."
  const statusRemoteModeLabel = remoteStatus
    ? remoteStatus.connectionSummary
    : "Inactive"
  const statusNetworkLabel = getNetworkLabel(isOnline)
  const statusSessionLabel = remoteStatus
    ? control === "42"
      ? "Control participant"
      : "Readonly participant"
    : undefined
  const statusRelayReachabilityLabel = remoteStatus
    ? getRelayReachabilityLabel(relayReachability)
    : undefined
  const getErrorReportBody = () =>
    buildErrorReportBody({
      connectionCount,
      connectionDetails,
      error,
      errorText: remoteErrorText,
      floatingTimerErrorText,
      hasFocus:
        typeof document !== "undefined" ? document.hasFocus() : "unavailable",
      isOnline: isOnline ?? "unavailable",
      isReadonlyClient,
      params,
      participantRole: control === "42" ? "control" : "readonly",
      participantStatus: sessionId ? "connected" : "disconnected",
      peerEventTimeline,
      relayLabel,
      relayReachabilityLabel: statusRelayReachabilityLabel,
      remoteIdParam,
      sessionId,
      statusDescription,
      statusModeLabel,
      statusNetworkLabel,
      statusRemoteModeLabel,
      statusSessionLabel,
      statusStateLabel,
      visibilityState:
        typeof document !== "undefined"
          ? document.visibilityState
          : "unavailable",
    })
  const floatingTimerData = useFloatingTimerPiP({
    setErrorText: setFloatingTimerErrorText,
    state: {
      backgroundColor: bg,
      elapsedPercentage,
      foregroundColor: fg,
      isTimedOut,
      minutes,
      primaryColor: pc,
      seconds,
      title,
    },
  })

  return (
    <>
      {!isReadonlyClient && (
        <Settings
          floatingTimerData={floatingTimerData}
          isOpen={isSettingsOpen}
          peerData={remoteSession}
          paramData={paramData}
          closeSettings={closeSettings}
          handleChange={handleChange}
        />
      )}
      <Timer
        isReadonly={isReadonlyClient}
        readonlyPlaceholderState={readonlyPlaceholderState}
        title={title}
        handleChange={handleChange}
        timer={timer}
      />
      {!isReadonlyClient && <SettingsButton onClick={openSettings} />}
      <StatusPopover
        activityLog={peerEventTimeline}
        connectionCount={connectionCount}
        connectionDetails={connectionDetails}
        errorText={remoteErrorText}
        floatingTimerErrorText={floatingTimerErrorText}
        getErrorReportBody={getErrorReportBody}
        isOnline={isOnline}
        isRetrying={isConnecting}
        onRetry={retryConnection}
        relayLabel={relayLabel}
        relayReachability={relayReachability}
        remoteStatus={remoteStatus}
        sessionId={sessionId}
      />
    </>
  )
}
