"use client"

import {
  Suspense,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePathname } from "next/navigation"

import type { SyncParams } from "@/shared/remoteSession/types"
import buildErrorReportBody from "@/utils/buildErrorReportBody"
import debug from "@/utils/debug"
import useFloatingTimerPiP from "@/utils/useFloatingTimerPiP"
import getRemoteStatus, { type RemoteStatusState } from "@/utils/remoteStatus"
import useRemoteSession from "@/utils/remoteSession"
import { getRemoteRelayLabel } from "@/utils/remoteSession/config"
import { parseRemoteRoute } from "@/utils/remoteSession/route"
import useRemoteRelayReachability from "@/utils/remoteSession/useRemoteRelayReachability"
import { normalizeTimeParts } from "@/utils/timeInputHelpers"
import {
  ArrowsPointingOutIcon,
  ShareIcon,
  WindowIcon,
  XMarkIcon,
} from "@/utils/icons"
import useNetworkStatus from "@/utils/useNetworkStatus"
import useParams from "@/utils/useParams"
import useTimer, { type TimerState } from "@/utils/useTimer"
import useSyncConflictResolution from "@/app/useSyncConflictResolution"

import StatusBadge from "@/components/StatusBadge"
import QrCodeOverlay from "@/components/QrCodeOverlay"
import SyncConflictDialog from "@/components/SyncConflictDialog"
import Timer from "@/components/Timer"
import Sidebar from "@/components/Sidebar"

function TopRightActionButton({
  ariaLabel,
  isActive = false,
  onClick,
  title,
  children,
}: {
  ariaLabel: string
  isActive?: boolean
  onClick: () => void
  title: string
  children: ReactNode
}) {
  return (
    <button
      aria-label={ariaLabel}
      className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-background/84 transition focus:outline-2 focus:-outline-offset-2 focus:outline-primary ${
        isActive
          ? "bg-background/96 text-primary"
          : "text-foreground/78 hover:bg-background hover:text-primary"
      }`}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  )
}

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

function pauseUrlSyncDuringRemoteRouteTransition() {
  if (typeof window === "undefined") {
    return
  }

  ;(
    window as typeof window & { __timerSkipUrlSyncUntil?: number }
  ).__timerSkipUrlSyncUntil = Date.now() + 2_000
}

function getReadonlyPlaceholder({
  remoteError,
  remoteStatus,
}: {
  remoteError: Error | null
  remoteStatus: ReturnType<typeof getRemoteStatus>
}) {
  const readonlyPlaceholderToneByRemoteState: Partial<
    Record<RemoteStatusState, "connecting" | "failed" | "reconnecting">
  > = {
    connecting: "connecting",
    failed: "failed",
    reconnecting: "reconnecting",
  }

  if (!remoteStatus) {
    return undefined
  }

  const tone = readonlyPlaceholderToneByRemoteState[remoteStatus.state]
  if (!tone) {
    return undefined
  }

  return {
    body:
      remoteError?.message.trim() ||
      remoteStatus.description ||
      "Waiting for the shared timer state.",
    eyebrow: remoteStatus.connectionSummary,
    heading: remoteStatus.stateLabel,
    tone,
  }
}

function getStatusDetails({
  floatingTimerErrorText,
  isOnline,
  relayReachability,
  remoteErrorText,
  remoteStatus,
  remoteStatusRole,
}: {
  floatingTimerErrorText: string | null
  isOnline: boolean | null
  relayReachability: "checking" | "reachable" | "unreachable"
  remoteErrorText: string | null
  remoteStatus: ReturnType<typeof getRemoteStatus>
  remoteStatusRole: "control" | "readonly"
}) {
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
      : "Remote mode is off. Open Share when you want to start a remote session."

  return {
    statusDescription,
    statusModeLabel,
    statusNetworkLabel: getNetworkLabel(isOnline),
    statusRelayReachabilityLabel: remoteStatus
      ? getRelayReachabilityLabel(relayReachability)
      : undefined,
    statusRemoteModeLabel: remoteStatus
      ? remoteStatus.connectionSummary
      : "Inactive",
    statusSessionLabel: remoteStatus
      ? remoteStatusRole === "control"
        ? "Control participant"
        : "Readonly participant"
      : undefined,
    statusStateLabel,
  }
}

export default function TimerPage() {
  return (
    <Suspense fallback={null}>
      <TimerApp />
    </Suspense>
  )
}

function TimerApp() {
  const syncStateRef = useRef<TimerState>({} as TimerState)

  const nextPathname = usePathname()
  const pathname =
    typeof window === "undefined" ? nextPathname : window.location.pathname
  const remoteRoute = useMemo(() => parseRemoteRoute(pathname), [pathname])
  const paramData = useParams()
  const { params } = paramData
  const { title, bg, fg, pc, m, s } = params

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

  const [isSidebarPinnedOpen, setIsSidebarPinnedOpen] = useState(false)
  const [selectedSidebarEntryId, setSelectedSidebarEntryId] = useState<
    "settings" | "share" | "status" | "timer" | null
  >(null)
  const [, setLocationVersion] = useState(0)
  const [isViewerShareQrCodeOpen, setIsViewerShareQrCodeOpen] = useState(false)
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const [syncState, setSyncState] = useState<TimerState>({} as TimerState)
  const remoteRole = remoteRoute.isRemote ? remoteRoute.role : null
  const remoteToken = remoteRoute.isRemote ? remoteRoute.token : null
  const isReadonlyClient = remoteRole === "readonly"

  const timer = useTimer({
    canMutate: !isReadonlyClient,
    params: syncParams,
    syncStateRef,
    shortcutsEnabled: !isReadonlyClient,
    onAction: (_action, state) => {
      setSyncState(state)
    },
  })
  const { setState } = timer
  const { minutes, seconds, isTimedOut, elapsedPercentage } = timer

  const remoteLinkError =
    remoteRoute.isRemote && remoteRoute.token === null
      ? new Error(
          "Remote session link is malformed. Check the URL and try again.",
        )
      : null

  const {
    applyUrlSyncState,
    clearSyncConflict,
    getReconnectSnapshot,
    hasSyncConflict,
    notifyIncomingSyncConflict,
    shouldDeferIncomingSnapshot,
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
    onIncomingSyncConflict: notifyIncomingSyncConflict,
    remoteRole: remoteLinkError ? null : remoteRole,
    remoteToken: remoteLinkError ? null : remoteToken,
    shouldDeferIncomingSnapshot,
    syncParamsRef,
    syncStateRef,
    onHandleAction: (action) => {
      if (action.params) {
        paramData.setParams(action.params)
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
    connectRemote,
    connectionCount,
    connectionDetails,
    disconnect,
    error,
    hasConnectedOnce,
    hasPendingSyncConflict,
    hasReceivedInitialSync,
    isConnecting,
    lifecycleState,
    peerEventTimeline,
    resolvePendingSyncConflict,
    retryConnection,
    sessionId,
    syncAll,
  } = remoteSession

  const applyParamPatch = useCallback(
    (newParams: Partial<SyncParams>) => {
      syncParamsRef.current = {
        ...syncParamsRef.current,
        ...newParams,
      }
      paramData.setParams(newParams)
      syncAll({ keys: Object.keys(newParams) })
    },
    [paramData, syncAll],
  )

  const handleChange = useCallback(
    (key: string, value: string) => {
      applyParamPatch({ [key]: value })
    },
    [applyParamPatch],
  )

  const normalizeTimerInputs = useCallback(() => {
    const normalizedTime = normalizeTimeParts({
      minutes: syncParamsRef.current.m,
      seconds: syncParamsRef.current.s,
    })

    if (
      normalizedTime.minutes === syncParamsRef.current.m &&
      normalizedTime.seconds === syncParamsRef.current.s
    ) {
      return
    }

    applyParamPatch({
      m: normalizedTime.minutes,
      s: normalizedTime.seconds,
    })
  }, [applyParamPatch])

  const isHostRemoteSession =
    remoteRole === null && Boolean(sessionId || isConnecting || error)
  const remoteStatusRole = remoteRole === "readonly" ? "readonly" : "control"
  const remoteError = remoteLinkError ?? error
  const remoteStatusEnabled = remoteRoute.isRemote || isHostRemoteSession

  useEffect(() => {
    syncAll({ includeParams: false, state: syncState })
  }, [syncAll, syncState])

  useEffect(() => {
    if (!hasPendingSyncConflict) {
      clearSyncConflict()
    }
  }, [clearSyncConflict, hasPendingSyncConflict])

  useEffect(() => {
    if (typeof document === "undefined") {
      return
    }

    setIsFullscreenSupported(Boolean(document.fullscreenEnabled))
    setIsFullscreen(Boolean(document.fullscreenElement))

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const handleStartRemoteSession = useCallback(async () => {
    await connectRemote()
  }, [connectRemote])

  const handleEndRemoteSession = useCallback(async () => {
    if (remoteRole === "control") {
      if (typeof window === "undefined") {
        return
      }

      pauseUrlSyncDuringRemoteRouteTransition()
      window.history.replaceState(
        null,
        "",
        paramData.getPathWithParams({ pathname: "/" }),
      )
      setLocationVersion((current) => current + 1)
      return
    }

    if (remoteRole || sessionId) {
      await disconnect()
    }
  }, [disconnect, paramData, remoteRole, sessionId])

  const handleUseServerSyncState = useCallback(() => {
    clearSyncConflict()
    resolvePendingSyncConflict("use-server")
  }, [clearSyncConflict, resolvePendingSyncConflict])

  const handleUseUrlSyncState = useCallback(() => {
    applyUrlSyncState()
    resolvePendingSyncConflict("use-local")
  }, [applyUrlSyncState, resolvePendingSyncConflict])

  const remoteErrorText = remoteError
    ? remoteRoute.isRemote
      ? `Remote link has a connection problem. ${getConnectionErrorDetail(remoteError)}`
      : `Remote mode could not start. ${getConnectionErrorDetail(remoteError)}`
    : null
  const [floatingTimerErrorText, setFloatingTimerErrorText] = useState<
    string | null
  >(null)

  const isOnline = useNetworkStatus()
  const relayLabel = getRemoteRelayLabel()
  const relayReachability = useRemoteRelayReachability(remoteStatusEnabled)
  const remoteStatus = getRemoteStatus({
    canRetryManually,
    hasConnectedOnce,
    hasReceivedInitialSync,
    isRemoteEnabled: remoteStatusEnabled,
    lifecycleState:
      remoteLinkError && lifecycleState !== "reconnecting"
        ? "failed"
        : lifecycleState,
    participantCount: connectionCount,
    role: remoteStatusRole,
    showPendingHostStatus: isHostRemoteSession && !sessionId,
  })
  const readonlyPlaceholder = isReadonlyClient
    ? getReadonlyPlaceholder({
        remoteError,
        remoteStatus,
      })
    : undefined
  const {
    statusDescription,
    statusModeLabel,
    statusNetworkLabel,
    statusRelayReachabilityLabel,
    statusRemoteModeLabel,
    statusSessionLabel,
    statusStateLabel,
  } = getStatusDetails({
    floatingTimerErrorText,
    isOnline,
    relayReachability,
    remoteErrorText,
    remoteStatus,
    remoteStatusRole,
  })
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
      relayReachabilityLabel: statusRelayReachabilityLabel,
      remotePath: pathname,
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
  const viewerShareUrl =
    typeof window === "undefined" ? "" : window.location.href

  return (
    <div className="relative flex h-screen flex-col">
      {hasSyncConflict && (
        <SyncConflictDialog
          onUseLocal={handleUseUrlSyncState}
          onUseServer={handleUseServerSyncState}
        />
      )}
      <Sidebar
        floatingTimerData={floatingTimerData}
        handleChange={handleChange}
        handleTimeBlur={normalizeTimerInputs}
        isPinnedOpen={isSidebarPinnedOpen}
        paramData={paramData}
        peerData={remoteSession}
        remoteRole={remoteRole}
        selectedEntryId={selectedSidebarEntryId}
        onEndRemoteSession={handleEndRemoteSession}
        onStartRemoteSession={handleStartRemoteSession}
        setIsPinnedOpen={setIsSidebarPinnedOpen}
        setSelectedEntryId={setSelectedSidebarEntryId}
        statusPanelData={{
          activityLog: peerEventTimeline,
          connectionDetails,
          errorText: remoteErrorText,
          floatingTimerErrorText,
          getErrorReportBody,
          isOnline,
          isRetrying: isConnecting,
          onRetry: retryConnection,
          relayLabel,
          relayReachability,
          remoteStatus,
          sessionId,
        }}
      />
      <div className="absolute right-0 top-0 z-20 flex items-center px-2 py-2">
        <TopRightActionButton
          ariaLabel={isReadonlyClient ? "Share viewer link" : "Open sharing"}
          isActive={
            isReadonlyClient
              ? isViewerShareQrCodeOpen
              : selectedSidebarEntryId === "share" && isSidebarPinnedOpen
          }
          onClick={() => {
            if (isReadonlyClient) {
              setIsViewerShareQrCodeOpen(true)
              return
            }

            setSelectedSidebarEntryId("share")
            setIsSidebarPinnedOpen(true)
          }}
          title="Share"
        >
          <ShareIcon className="h-4 w-4" />
        </TopRightActionButton>
        {!isReadonlyClient && floatingTimerData.isSupported && (
          <TopRightActionButton
            ariaLabel="Toggle floating window"
            isActive={floatingTimerData.isOpen}
            onClick={() => {
              void floatingTimerData.toggle()
            }}
            title="Floating window"
          >
            <WindowIcon className="h-4 w-4" />
          </TopRightActionButton>
        )}
        {!isReadonlyClient && isFullscreenSupported && (
          <TopRightActionButton
            ariaLabel={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={() => {
              if (typeof document === "undefined") {
                return
              }

              if (document.fullscreenElement) {
                void document.exitFullscreen()
                return
              }

              void document.documentElement.requestFullscreen()
            }}
            title={isFullscreen ? "Close fullscreen" : "Fullscreen mode"}
          >
            {isFullscreen ? (
              <XMarkIcon className="h-4 w-4" />
            ) : (
              <ArrowsPointingOutIcon className="h-4 w-4" />
            )}
          </TopRightActionButton>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <Timer
          isReadonly={isReadonlyClient}
          readonlyPlaceholder={readonlyPlaceholder}
          title={title}
          handleChange={handleChange}
          handleTimeBlur={normalizeTimerInputs}
          timer={timer}
        />
      </div>
      <StatusBadge
        connectionCount={connectionCount}
        errorText={remoteErrorText}
        floatingTimerErrorText={floatingTimerErrorText}
        isOnline={isOnline}
        onOpenStatusPanel={() => {
          setSelectedSidebarEntryId("status")
          setIsSidebarPinnedOpen(true)
        }}
        relayReachability={relayReachability}
        remoteRole={remoteStatusRole}
        remoteStatus={remoteStatus}
        sessionId={sessionId}
      />
      {isReadonlyClient && isViewerShareQrCodeOpen && viewerShareUrl && (
        <QrCodeOverlay
          label="Viewer Link"
          onClose={() => setIsViewerShareQrCodeOpen(false)}
          value={viewerShareUrl}
        />
      )}
    </div>
  )
}
