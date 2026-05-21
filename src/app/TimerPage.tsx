"use client"

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePathname } from "next/navigation"

import ActionDialog from "@/components/ActionDialog"
import Sidebar from "@/components/Sidebar"
import StatusBadge from "@/components/StatusBadge"
import SyncConflictDialog from "@/components/SyncConflictDialog"
import Timer from "@/components/Timer"
import TopRightControls from "@/components/TimerPageTopRightControls"
import type { SyncParams } from "@/shared/remoteSession/types"
import { parseRemoteRoute } from "@/utils/remoteSession/route"
import { isPromotedHostControlClient } from "@/utils/timerPage/routeTransition"
import usePromoteHostControlRoute from "@/utils/timerPage/usePromoteHostControlRoute"
import useRemoteSessionDialogs from "@/utils/timerPage/useRemoteSessionDialogs"
import useSessionDiagnostics from "@/utils/timerPage/useSessionDiagnostics"
import useTimerPageRemoteSession from "@/utils/timerPage/useTimerPageRemoteSession"
import { normalizeTimeParts } from "@/utils/timeInputHelpers"
import useParams from "@/utils/useParams"
import useTimer, { type TimerState } from "@/utils/useTimer"

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
  const syncParams = { bg, fg, m, pc, s, title }
  const syncParamsRef = useRef<SyncParams>(syncParams)
  syncParamsRef.current = syncParams

  const [isSidebarPinnedOpen, setIsSidebarPinnedOpen] = useState(false)
  const [selectedSidebarEntryId, setSelectedSidebarEntryId] = useState<
    "settings" | "share" | "status" | "timer" | null
  >(null)
  const [, setLocationVersion] = useState(0)
  const [hasRecentlyEndedLiveSession, setHasRecentlyEndedLiveSession] =
    useState(false)
  const [syncState, setSyncState] = useState<TimerState>({} as TimerState)

  const remoteRole = remoteRoute.isRemote ? remoteRoute.role : null
  const remoteToken = remoteRoute.isRemote ? remoteRoute.token : null
  const isReadonlyClient = remoteRole === "readonly"

  const timer = useTimer({
    canMutate: !isReadonlyClient,
    onAction: (_action, state) => {
      setSyncState(state)
    },
    params: syncParams,
    shortcutsEnabled: !isReadonlyClient,
    syncStateRef,
  })
  const { elapsedPercentage, isTimedOut, minutes, seconds, setState } = timer

  const { remoteLinkError, remoteSession } = useTimerPageRemoteSession({
    hasRecentlyEndedLiveSession,
    paramData,
    remoteRole,
    remoteToken,
    setState,
    syncParamsRef,
    syncStateRef,
  })

  const {
    accessTokens,
    activateLocalFallback,
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
    localClientId,
    localFallbackReason,
    participants,
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
  const remoteStatusEnabled = remoteRoute.isRemote || isHostRemoteSession
  const remoteError = remoteLinkError ?? error
  const otherParticipantCount = Math.max(connectionCount - 1, 0)
  const hasOtherConnectedClients = otherParticipantCount > 0
  const isControlCapableClient = !isReadonlyClient
  const isPromotedHostControlRoute =
    remoteRole === "control" && isPromotedHostControlClient()
  const handleLocationReplaced = useCallback(() => {
    setLocationVersion((current) => current + 1)
  }, [])
  const openSidebarEntry = useCallback(
    (entryId: "settings" | "share" | "status" | "timer") => {
      setSelectedSidebarEntryId(entryId)
      setIsSidebarPinnedOpen(true)
    },
    [],
  )
  const openSharePanel = useCallback(() => {
    openSidebarEntry("share")
  }, [openSidebarEntry])
  const openStatusPanel = useCallback(() => {
    openSidebarEntry("status")
  }, [openSidebarEntry])
  const openStatusOrSharePanel = useCallback(() => {
    openSidebarEntry(isReadonlyClient ? "status" : "share")
  }, [isReadonlyClient, openSidebarEntry])
  const isSharePanelOpen =
    selectedSidebarEntryId === "share" && isSidebarPinnedOpen

  const {
    clearRecentlyEndedLiveSession,
    exitConfirmationDialog,
    handleEndRemoteSession,
    recoveryDialog,
  } = useRemoteSessionDialogs({
    activateLocalFallback,
    disconnect,
    hasRecentlyEndedLiveSession,
    hasOtherConnectedClients,
    hasPendingSyncConflict,
    isControlCapableClient,
    isPromotedHostControlRoute,
    localFallbackReason,
    onLocationReplaced: handleLocationReplaced,
    otherParticipantCount,
    paramData,
    remoteRole,
    resolvePendingSyncConflict,
    retryConnection,
    setHasRecentlyEndedLiveSession,
    sessionId,
    setState,
    syncParamsRef,
  })

  useEffect(() => {
    syncAll({ includeParams: false, state: syncState })
  }, [syncAll, syncState])

  usePromoteHostControlRoute({
    accessControlToken: accessTokens?.control,
    hasRecentlyEndedLiveSession,
    onLocationReplaced: handleLocationReplaced,
    remoteRole,
  })

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

  const {
    floatingTimerData,
    floatingTimerErrorText,
    getErrorReportBody,
    isOnline,
    readonlyPlaceholder,
    relayLabel,
    relayReachability,
    remoteErrorText,
    sessionPresentation,
  } = useSessionDiagnostics({
    canRetryManually,
    connectionCount,
    connectionDetails,
    hasConnectedOnce,
    hasPendingSyncConflict,
    hasReceivedInitialSync,
    hasRecentlyEndedLiveSession,
    isHostRemoteSession,
    isReadonlyClient,
    lifecycleState:
      remoteLinkError && lifecycleState !== "reconnecting"
        ? "failed"
        : lifecycleState,
    onOpenStatusPanel: openStatusPanel,
    params,
    participants,
    pathname,
    peerEventTimeline,
    remoteError,
    remoteRole,
    remoteStatusEnabled,
    sessionId,
    timerState: {
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

  const handleStartRemoteSession = useCallback(async () => {
    clearRecentlyEndedLiveSession()
    await connectRemote()
  }, [clearRecentlyEndedLiveSession, connectRemote])

  return (
    <div className="relative flex h-screen flex-col">
      {recoveryDialog ? (
        <SyncConflictDialog
          actions={recoveryDialog.actions}
          description={recoveryDialog.description}
          getDeveloperReportBody={getErrorReportBody}
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
        onEndRemoteSession={handleEndRemoteSession}
        onStartRemoteSession={handleStartRemoteSession}
        paramData={paramData}
        peerData={remoteSession}
        remoteRole={remoteRole}
        selectedEntryId={selectedSidebarEntryId}
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
      <TopRightControls
        floatingTimerData={floatingTimerData}
        isSharePanelOpen={isSharePanelOpen}
        isReadonlyClient={isReadonlyClient}
        onOpenSharePanel={openSharePanel}
      />
      <div className="min-h-0 flex-1">
        <Timer
          handleChange={handleChange}
          handleTimeBlur={normalizeTimerInputs}
          isReadonly={isReadonlyClient}
          readonlyPlaceholder={readonlyPlaceholder}
          timer={timer}
          title={title}
        />
      </div>
      <StatusBadge
        connectionCount={connectionCount}
        errorText={remoteErrorText}
        floatingTimerErrorText={floatingTimerErrorText}
        isOnline={isOnline}
        onOpenSharePanel={openStatusOrSharePanel}
        relayReachability={relayReachability}
        sessionPresentation={sessionPresentation}
        sessionId={sessionId}
      />
    </div>
  )
}
