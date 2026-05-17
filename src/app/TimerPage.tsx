"use client"

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePathname, useSearchParams } from "next/navigation"

import type { SyncParams } from "@/shared/remoteSession/types"
import buildErrorReportBody from "@/utils/buildErrorReportBody"
import debug from "@/utils/debug"
import useFloatingTimerPiP from "@/utils/useFloatingTimerPiP"
import getRemoteStatus, { type RemoteStatusState } from "@/utils/remoteStatus"
import useRemoteSession from "@/utils/remoteSession"
import { getRemoteRelayLabel } from "@/utils/remoteSession/config"
import { buildRemotePath, parseRemoteRoute } from "@/utils/remoteSession/route"
import useRemoteRelayReachability from "@/utils/remoteSession/useRemoteRelayReachability"
import { normalizeTimeParts } from "@/utils/timeInputHelpers"
import useNetworkStatus from "@/utils/useNetworkStatus"
import useParams from "@/utils/useParams"
import useTimer, { type TimerState } from "@/utils/useTimer"
import useSyncConflictResolution from "@/app/useSyncConflictResolution"

import Settings from "@/components/Settings"
import SettingsButton from "@/components/SettingsButton"
import StatusPopover from "@/components/StatusPopover"
import SyncConflictDialog from "@/components/SyncConflictDialog"
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
      : "Remote mode is off. Open settings when you want to share the timer."

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

const REOPEN_SETTINGS_QUERY_PARAM = "settings"

export default function TimerPage() {
  return (
    <Suspense fallback={null}>
      <TimerApp />
    </Suspense>
  )
}

function TimerApp() {
  const syncStateRef = useRef<TimerState>({} as TimerState)

  const pathname = usePathname()
  const searchParams = useSearchParams()
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

  const shouldReopenSettings =
    remoteRoute.role !== "readonly" &&
    searchParams.get(REOPEN_SETTINGS_QUERY_PARAM) === "1"
  const [isSettingsOpen, setIsSettingsOpen] = useState(shouldReopenSettings)
  const [shouldPromoteToControlUrl, setShouldPromoteToControlUrl] =
    useState(false)
  const closeSettings = () => setIsSettingsOpen(false)
  const openSettings = () => setIsSettingsOpen(true)

  const [syncState, setSyncState] = useState<TimerState>({} as TimerState)
  const remoteRole = remoteRoute.isRemote ? remoteRoute.role : null
  const remoteToken = remoteRoute.isRemote ? remoteRoute.token : null
  const isReadonlyClient = remoteRole === "readonly"

  const timer = useTimer({
    canMutate: !isReadonlyClient,
    params: syncParams,
    syncStateRef,
    shortcutsEnabled: !isSettingsOpen && !isReadonlyClient,
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
    accessTokens,
    canRetryManually,
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
    if (
      typeof window === "undefined" ||
      searchParams.get(REOPEN_SETTINGS_QUERY_PARAM) !== "1"
    ) {
      return
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.delete(REOPEN_SETTINGS_QUERY_PARAM)
    const nextSearch = nextSearchParams.toString()
    window.history.replaceState(
      null,
      "",
      `${pathname}${nextSearch ? `?${nextSearch}` : ""}`,
    )
  }, [pathname, searchParams])

  useEffect(() => {
    syncAll({ includeParams: false, state: syncState })
  }, [syncAll, syncState])

  useEffect(() => {
    if (!hasPendingSyncConflict) {
      clearSyncConflict()
    }
  }, [clearSyncConflict, hasPendingSyncConflict])

  useEffect(() => {
    if (
      !shouldPromoteToControlUrl ||
      remoteRole !== null ||
      !accessTokens?.control
    ) {
      return
    }

    const controlToken = accessTokens.control
    setShouldPromoteToControlUrl(false)
    void (async () => {
      await disconnect()
      if (typeof window !== "undefined") {
        window.location.replace(
          `${buildRemotePath({
            role: "control",
            token: controlToken,
          })}?${REOPEN_SETTINGS_QUERY_PARAM}=1`,
        )
      }
    })()
  }, [accessTokens?.control, disconnect, remoteRole, shouldPromoteToControlUrl])

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

  return (
    <>
      {hasSyncConflict && (
        <SyncConflictDialog
          onUseLocal={handleUseUrlSyncState}
          onUseServer={handleUseServerSyncState}
        />
      )}
      {!isReadonlyClient && (
        <Settings
          floatingTimerData={floatingTimerData}
          isOpen={isSettingsOpen}
          peerData={remoteSession}
          paramData={paramData}
          closeSettings={closeSettings}
          handleChange={handleChange}
          handleTimeBlur={normalizeTimerInputs}
          setShouldPromoteToControlUrl={setShouldPromoteToControlUrl}
          remoteRole={remoteRole}
        />
      )}
      <Timer
        isReadonly={isReadonlyClient}
        readonlyPlaceholder={readonlyPlaceholder}
        title={title}
        handleChange={handleChange}
        handleTimeBlur={normalizeTimerInputs}
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
