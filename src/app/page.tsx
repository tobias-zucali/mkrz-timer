"use client"
import { Suspense, useEffect, useRef, useState } from "react"

import debug from "@/utils/debug"
import buildErrorReportBody from "@/utils/buildErrorReportBody"
import { getPeerServerLabel } from "@/utils/peerServerConfig"
import useFloatingTimerPiP from "@/utils/useFloatingTimerPiP"
import useParams from "@/utils/useParams"
import getRemoteStatus from "@/utils/remoteStatus"
import type { RemoteStatusState } from "@/utils/remoteStatus"
import useNetworkStatus from "@/utils/useNetworkStatus"
import usePeerServerReachability from "@/utils/usePeerServerReachability"
import usePeer, { SyncParams } from "@/utils/usePeer"
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

function getPeerServerReachabilityLabel(
  peerServerReachability: "checking" | "managed" | "reachable" | "unreachable",
) {
  switch (peerServerReachability) {
    case "reachable":
      return "Reachable"
    case "unreachable":
      return "Unreachable"
    case "checking":
      return "Checking"
    case "managed":
      return "Managed by PeerJS cloud"
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

  const [syncKeys, setSyncKeys] = useState<string[]>([])

  const handleChange = (key: string, value: string) => {
    setParams({ [key]: value })
    setSyncKeys((curr) => [...curr, key])
  }

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

  // handle connection
  const peerData = usePeer({
    canControlSession: control === "42",
    remoteIdParam,
    syncParamsRef,
    syncStateRef,
    onHandleAction: (action) => {
      if (action.type === "sync") {
        if (action.params) {
          setParams(action.params)
        }
        if (action.state) {
          setState(action.state)
        }
      } else {
        // handle other actions if needed
        debug.error("Unhandled action:", action)
      }
    },
  })

  const {
    connections,
    canRetryManually,
    hasConnectedOnce,
    hasReceivedInitialSync,
    isConnecting,
    lifecycleState,
    peer,
    syncAll,
    error,
    peerId,
    retryConnection,
  } = peerData

  const isPendingHostStatus = !remoteIdParam && (isConnecting || Boolean(error))

  // debounced sync params
  useEffect(() => {
    const handler = setTimeout(() => {
      syncAll({ keys: syncKeys })
    }, 200)

    return () => {
      clearTimeout(handler)
    }
  }, [syncKeys, syncAll])

  // immediately sync state
  useEffect(() => {
    syncAll({ includeParams: false, state: syncState })
  }, [syncState, syncAll])

  const remoteErrorText = error
    ? remoteIdParam
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

  const connectionDetails = peer.getAllConnections()
  const peerRole =
    peerData.isHostingSession || !remoteIdParam ? "main" : "client"
  const isReadonlyClient = Boolean(remoteIdParam && control !== "42")
  const isOnline = useNetworkStatus()
  const peerServerLabel = getPeerServerLabel()
  const peerServerReachability = usePeerServerReachability(
    Boolean(remoteIdParam),
  )
  const remoteStatus = getRemoteStatus({
    canRetryManually,
    control,
    connectionDetails,
    connectionsCount: connections.length,
    hasConnectedOnce,
    hasReceivedInitialSync,
    isHostingSession: peerData.isHostingSession,
    lifecycleState,
    peerId,
    remoteIdParam,
    showPendingHostStatus: isPendingHostStatus,
  })
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
  const statusPeerSessionLabel = remoteStatus
    ? peerRole === "main"
      ? "Host peer"
      : "Joined peer"
    : undefined
  const statusPeerServerReachabilityLabel = remoteStatus
    ? getPeerServerReachabilityLabel(peerServerReachability)
    : undefined
  const getErrorReportBody = () =>
    buildErrorReportBody({
      errorText: remoteErrorText,
      floatingTimerErrorText,
      remoteIdParam,
      peerId,
      ownerSource: peerData.sessionSource,
      sessionEpoch: peerData.session?.epoch,
      sessionId: peerData.session?.sessionId,
      hostPeerId: peerData.session?.ownerPeerId,
      peerRole,
      peerStatus: peerId ? "connected" : "disconnected",
      isReadonlyClient,
      statusModeLabel,
      statusStateLabel,
      statusDescription,
      statusRemoteModeLabel,
      statusNetworkLabel,
      statusPeerSessionLabel,
      statusPeerServerReachabilityLabel,
      connectionsCount: connections.length,
      connectionDetails,
      peerServerLabel,
      error,
      params,
      isOnline: isOnline ?? "unavailable",
      visibilityState:
        typeof document !== "undefined"
          ? document.visibilityState
          : "unavailable",
      hasFocus:
        typeof document !== "undefined" ? document.hasFocus() : "unavailable",
      peerEventTimeline: peerData.peerEventTimeline ?? [],
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
          peerData={peerData}
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
        activityLog={peerData.peerEventTimeline ?? []}
        connectionCount={connections.length}
        connectionDetails={connectionDetails}
        errorText={remoteErrorText}
        floatingTimerErrorText={floatingTimerErrorText}
        getErrorReportBody={getErrorReportBody}
        isOnline={isOnline}
        isRetrying={isConnecting}
        onRetry={retryConnection}
        peerId={peerId}
        peerRole={peerRole}
        peerServerLabel={peerServerLabel}
        peerServerReachability={peerServerReachability}
        remoteStatus={remoteStatus}
        sessionEpoch={peerData.session?.epoch}
        sessionId={peerData.session?.sessionId}
        sessionOwnerPeerId={peerData.session?.ownerPeerId}
        sessionOwnerSource={peerData.sessionSource}
      />
    </>
  )
}
