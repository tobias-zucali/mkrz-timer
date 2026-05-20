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
import { buildRemotePath } from "@/utils/remoteSession/route"
import getSessionPresentation from "@/utils/sessionPresentation"
import useFloatingTimerPiP from "@/utils/useFloatingTimerPiP"
import getRemoteStatus from "@/utils/remoteStatus"
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
import ActionDialog from "@/components/ActionDialog"
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
      className={`
        inline-flex size-9 cursor-pointer items-center justify-center rounded-lg
        bg-background/84 transition
        focus:outline-2 focus:-outline-offset-2 focus:outline-primary
        ${
          isActive
            ? "bg-background/96 text-primary"
            : `
            text-foreground/78
            hover:bg-background hover:text-primary
          `
        }
      `}
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

function getOtherParticipantLabel(otherParticipantCount: number) {
  return otherParticipantCount === 1 ? "other client" : "other clients"
}

function getExitConfirmationDialog({
  completeEndRemoteSession,
  onCancel,
  otherParticipantCount,
  pendingExitConfirmation,
}: {
  completeEndRemoteSession: () => Promise<void>
  onCancel: () => void
  otherParticipantCount: number
  pendingExitConfirmation: "end-live-session" | "leave-control-client"
}) {
  const otherParticipantLabel = getOtherParticipantLabel(otherParticipantCount)

  if (pendingExitConfirmation === "end-live-session") {
    return {
      actions: [
        {
          label: "Keep live session open",
          onClick: onCancel,
        },
        {
          label: "End live session",
          onClick: () => {
            onCancel()
            void completeEndRemoteSession()
          },
          tone: "primary" as const,
        },
      ],
      description: `This will disconnect ${otherParticipantCount} ${otherParticipantLabel} from the live session immediately.`,
      eyebrow: "Live session confirmation",
      title: "End the live session for everyone?",
    }
  }

  return {
    actions: [
      {
        label: "Keep control client open",
        onClick: onCancel,
      },
      {
        label: "Leave control client",
        onClick: () => {
          onCancel()
          void completeEndRemoteSession()
        },
        tone: "primary" as const,
      },
    ],
    description: `This control client still has ${otherParticipantCount} ${otherParticipantLabel} connected. Leaving now can interrupt the active workshop.`,
    eyebrow: "Live session confirmation",
    title: "Close this control client?",
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

function setPromotedHostControlClient(isPromotedHostControlClient: boolean) {
  if (typeof window === "undefined") {
    return
  }

  ;(
    window as typeof window & {
      __timerPromotedHostControlClient?: boolean
    }
  ).__timerPromotedHostControlClient = isPromotedHostControlClient
}

function isPromotedHostControlClient() {
  if (typeof window === "undefined") {
    return false
  }

  return Boolean(
    (
      window as typeof window & {
        __timerPromotedHostControlClient?: boolean
      }
    ).__timerPromotedHostControlClient,
  )
}

function getReadonlyPlaceholder({
  onOpenStatusPanel,
  remoteError,
  sessionPresentation,
}: {
  onOpenStatusPanel: () => void
  remoteError: Error | null
  sessionPresentation: ReturnType<typeof getSessionPresentation>
}) {
  const readonlyPlaceholderToneBySessionState: Partial<
    Record<
      ReturnType<typeof getSessionPresentation>["state"],
      "connecting" | "failed" | "reconnecting"
    >
  > = {
    liveConflict: "failed",
    liveConnecting: "connecting",
    liveOffline: "reconnecting",
    liveReconnecting: "reconnecting",
  }

  const tone = readonlyPlaceholderToneBySessionState[sessionPresentation.state]
  if (!tone) {
    return undefined
  }

  const remoteErrorMessage = remoteError?.message.trim() ?? ""
  const showRetryLink =
    sessionPresentation.state === "liveConflict" &&
    /retry the connection/i.test(remoteErrorMessage)

  return {
    actionLabel: showRetryLink ? "Retry the connection" : undefined,
    body: showRetryLink
      ? "Automatic recovery timed out."
      : remoteErrorMessage ||
        sessionPresentation.statusPanel.description ||
        "Waiting for the shared timer state.",
    eyebrow: showRetryLink
      ? undefined
      : sessionPresentation.statusPanel.summaryLabel,
    heading: sessionPresentation.statusPanel.stateLabel,
    onAction: showRetryLink ? onOpenStatusPanel : undefined,
    tone,
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
  const [hasRecentlyEndedLiveSession, setHasRecentlyEndedLiveSession] =
    useState(false)
  const [isViewerShareQrCodeOpen, setIsViewerShareQrCodeOpen] = useState(false)
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pendingExitConfirmation, setPendingExitConfirmation] = useState<
    "end-live-session" | "leave-control-client" | null
  >(null)

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
          "Live session link is malformed. Check the URL and try again.",
        )
      : null

  const {
    getReconnectSnapshot,
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
    accessTokens,
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
    localFallbackReason,
    localClientId,
    peerEventTimeline,
    participants,
    resolvePendingSyncConflict,
    retryConnection,
    sessionId,
    syncAll,
    activateLocalFallback,
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
  const isPromotedHostControlRoute =
    remoteRole === "control" && isPromotedHostControlClient()
  const remoteStatusRole = remoteRole === "readonly" ? "readonly" : "control"
  const remoteError = remoteLinkError ?? error
  const remoteStatusEnabled = remoteRoute.isRemote || isHostRemoteSession
  const isControlCapableClient = !isReadonlyClient
  const otherParticipantCount = Math.max(connectionCount - 1, 0)
  const hasOtherConnectedClients = otherParticipantCount > 0

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
        paramData.getPathWithParams({ pathname: "/" }),
      )
      setLocationVersion((current) => current + 1)
      return
    }

    if (remoteRole || sessionId) {
      setHasRecentlyEndedLiveSession(true)
      await disconnect()
    }
  }, [disconnect, paramData, remoteRole, sessionId])

  useEffect(() => {
    syncAll({ includeParams: false, state: syncState })
  }, [syncAll, syncState])

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

  useEffect(() => {
    if (hasOtherConnectedClients) {
      return
    }

    setPendingExitConfirmation(null)
  }, [hasOtherConnectedClients])

  const handleStartRemoteSession = useCallback(async () => {
    setHasRecentlyEndedLiveSession(false)
    await connectRemote()
  }, [connectRemote])

  useEffect(() => {
    if (
      remoteRole !== null ||
      !accessTokens?.control ||
      hasRecentlyEndedLiveSession ||
      typeof window === "undefined"
    ) {
      return
    }

    const controlPath = buildRemotePath({
      role: "control",
      token: accessTokens.control,
    })

    if (window.location.pathname === controlPath) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      pauseUrlSyncDuringRemoteRouteTransition()
      setPromotedHostControlClient(true)
      window.history.replaceState(null, "", controlPath)
      setLocationVersion((current) => current + 1)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [accessTokens?.control, hasRecentlyEndedLiveSession, remoteRole])

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

  useEffect(() => {
    if (!isControlCapableClient || !hasOtherConnectedClients) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue =
        "Other live-session clients are still connected to this controller."
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [hasOtherConnectedClients, isControlCapableClient])

  const handleUseServerSyncState = useCallback(() => {
    resolvePendingSyncConflict("use-server")
  }, [resolvePendingSyncConflict])

  const handleUseLocalSyncState = useCallback(() => {
    resolvePendingSyncConflict("use-local")
  }, [resolvePendingSyncConflict])

  const handleUseLocalMode = useCallback(async () => {
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
    setLocationVersion((current) => current + 1)
  }, [activateLocalFallback, paramData, setState])

  const remoteErrorText = remoteError
    ? remoteRoute.isRemote
      ? `Live session link has a connection problem. ${getConnectionErrorDetail(remoteError)}`
      : `Live session could not start. ${getConnectionErrorDetail(remoteError)}`
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
    hasControllingParticipant: participants.some(
      (participant) => participant.canControl,
    ),
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
  const sessionPresentation = getSessionPresentation({
    hasPendingSyncConflict,
    hasRecentlyEndedSession: hasRecentlyEndedLiveSession,
    isOnline,
    relayReachability,
    remoteStatus,
  })
  const readonlyPlaceholder = isReadonlyClient
    ? getReadonlyPlaceholder({
        onOpenStatusPanel: () => {
          setSelectedSidebarEntryId("status")
          setIsSidebarPinnedOpen(true)
        },
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

  const recoveryDialog =
    hasPendingSyncConflict || localFallbackReason
      ? {
          actions: hasPendingSyncConflict
            ? [
                {
                  label: "Use server state",
                  onClick: handleUseServerSyncState,
                },
                {
                  label: "Push local changes",
                  onClick: handleUseLocalSyncState,
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
      : null
  const exitConfirmationDialog = pendingExitConfirmation
    ? getExitConfirmationDialog({
        completeEndRemoteSession,
        onCancel: () => {
          setPendingExitConfirmation(null)
        },
        otherParticipantCount,
        pendingExitConfirmation,
      })
    : null

  return (
    <div className="relative flex h-screen flex-col">
      {recoveryDialog ? (
        <SyncConflictDialog
          actions={recoveryDialog.actions}
          description={recoveryDialog.description}
          title={recoveryDialog.title}
        />
      ) : exitConfirmationDialog ? (
        <ActionDialog
          actions={exitConfirmationDialog.actions}
          defaultFocusActionIndex={0}
          description={exitConfirmationDialog.description}
          eyebrow={exitConfirmationDialog.eyebrow}
          title={exitConfirmationDialog.title}
        />
      ) : null}
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
          localClientId,
          onRetry: retryConnection,
          participants,
          relayLabel,
          relayReachability,
          sessionPresentation,
          sessionId,
        }}
      />
      <div className="absolute top-0 right-0 z-20 flex items-center p-2">
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
          <ShareIcon className="size-4" />
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
            <WindowIcon className="size-4" />
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
              <XMarkIcon className="size-4" />
            ) : (
              <ArrowsPointingOutIcon className="size-4" />
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
        onOpenSharePanel={() => {
          setSelectedSidebarEntryId(isReadonlyClient ? "status" : "share")
          setIsSidebarPinnedOpen(true)
        }}
        relayReachability={relayReachability}
        sessionPresentation={sessionPresentation}
        sessionId={sessionId}
      />
      {isReadonlyClient && isViewerShareQrCodeOpen && viewerShareUrl && (
        <QrCodeOverlay
          label="Viewer link"
          onClose={() => setIsViewerShareQrCodeOpen(false)}
          value={viewerShareUrl}
        />
      )}
    </div>
  )
}
