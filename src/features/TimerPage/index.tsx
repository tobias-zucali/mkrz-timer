"use client"

import {
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

import ActionDialog from "@/components/ActionDialog"
import Sidebar from "@/components/Sidebar"
import StatusBadge from "@/components/StatusBadge"
import SyncConflictDialog from "@/components/SyncConflictDialog"
import Timer from "@/components/Timer"
import TopRightControls from "@/components/TimerPageTopRightControls"
import TimerAnnouncements from "@/features/TimerPage/TimerAnnouncements"
import type { SyncParams } from "@/shared/remoteSession/types"
import { mergeSyncParamsPatch } from "@/shared/remoteSession/mergeSyncParamsPatch"
import { normalizeSyncParams } from "@/shared/security/input"
import { parseRemoteRoute } from "@/utils/remoteSession/route"
import { buildTimerSequenceChange } from "@/utils/timerSequenceEditor"
import { isPromotedHostControlClient } from "@/utils/timerPage/routeTransition"
import usePromoteHostControlRoute from "@/utils/timerPage/usePromoteHostControlRoute"
import useRemoteSessionDialogs from "@/utils/timerPage/useRemoteSessionDialogs"
import useSessionDiagnostics from "@/utils/timerPage/useSessionDiagnostics"
import useTimerPageRemoteSession from "@/utils/timerPage/useTimerPageRemoteSession"
import { buildDocumentTitle } from "@/utils/documentTitle"
import { normalizeTimeParts } from "@/utils/timeInputHelpers"
import useParams from "@/utils/useParams"
import {
  getRemoteSessionOnlyOmitKeys,
  getSettingsOnlyOmitKeys,
} from "@/utils/useParams/params"
import useTimer, { type TimerState } from "@/utils/useTimer"

const SHARE_PANEL_SETTINGS_STORAGE_KEY = "timer.share.includeVoiceSoundSettings"

export default function TimerPage() {
  return (
    <Suspense fallback={null}>
      <TimerApp />
    </Suspense>
  )
}

function TimerApp() {
  const t = useTranslations("TimerPage.page")
  const tAppShell = useTranslations("AppShell")
  const sidebarOffcanvasId = useId()
  const syncStateRef = useRef<TimerState>({} as TimerState)

  const nextPathname = usePathname()
  const pathname =
    typeof window === "undefined" ? nextPathname : window.location.pathname
  const remoteRoute = useMemo(() => parseRemoteRoute(pathname), [pathname])
  const paramData = useParams()
  const { pageTitle, params } = paramData
  const { title, bg, fg, pc } = params
  const syncParams = params
  const syncParamsRef = useRef<SyncParams>(syncParams)
  syncParamsRef.current = syncParams

  const [isSidebarPinnedOpen, setIsSidebarPinnedOpen] = useState(false)
  const [selectedSidebarEntryId, setSelectedSidebarEntryId] = useState<
    "settings" | "share" | "status" | "timer" | null
  >(null)
  const [, setLocationVersion] = useState(0)
  const [hasRecentlyEndedLiveSession, setHasRecentlyEndedLiveSession] =
    useState(false)
  const [includeSettingsInShareUrls, setIncludeSettingsInShareUrls] =
    useState(true)
  const [
    hasLoadedShareSettingsPreference,
    setHasLoadedShareSettingsPreference,
  ] = useState(false)
  const [pendingTimerParamPatch, setPendingTimerParamPatch] =
    useState<Partial<SyncParams> | null>(null)
  const [pendingTimerCommand, setPendingTimerCommand] = useState<
    "next" | "pause" | "previous" | "reset" | "start" | "activate" | null
  >(null)

  const remoteRole = remoteRoute.isRemote ? remoteRoute.role : null
  const remoteToken = remoteRoute.isRemote ? remoteRoute.token : null
  const isReadonlyClient = remoteRole === "readonly"
  const shareableParams = useMemo(
    () => ({
      ...params,
      pageTitle,
    }),
    [pageTitle, params],
  )

  const timer = useTimer({
    canMutate: !isReadonlyClient,
    onAction: (action, payload) => {
      if (payload.params) {
        setPendingTimerParamPatch(payload.params)
      }
      setPendingTimerCommand(
        action === "restart"
          ? "reset"
          : action === "pause" ||
              action === "start" ||
              action === "next" ||
              action === "previous"
            ? action
            : null,
      )
    },
    params: syncParams,
    sequenceAuthority: remoteRole !== null ? "server" : "client",
    syncParamsRef,
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
      syncParamsRef.current = normalizeSyncParams(
        mergeSyncParamsPatch(syncParamsRef.current, newParams),
        syncParamsRef.current,
      )
      paramData.setParams(newParams)
      syncAll({ keys: Object.keys(newParams) })
    },
    [paramData, syncAll],
  )

  const updateActiveRow = useCallback(
    (
      updater: (
        row: SyncParams["rows"][number],
        index: number,
      ) => SyncParams["rows"][number],
    ) => {
      const currentParams = syncParamsRef.current
      const nextRows = currentParams.rows.map((row, index) =>
        index === currentParams.activeIndex ? updater(row, index) : row,
      )

      applyParamPatch({ rows: nextRows })
    },
    [applyParamPatch],
  )

  const handleChange = useCallback(
    (key: string, value: string) => {
      if (key === "bg" || key === "fg" || key === "snd" || key === "tts") {
        applyParamPatch({
          [key]: key === "tts" ? value === "1" : value,
        } as Partial<SyncParams>)
        return
      }

      if (key === "title") {
        updateActiveRow((row) => ({ ...row, title: value }))
        return
      }

      if (key === "pc") {
        updateActiveRow((row) => ({ ...row, primaryColor: value }))
        return
      }

      if (key === "m" || key === "s") {
        const nextMinutes = key === "m" ? value : syncParamsRef.current.m
        const nextSeconds = key === "s" ? value : syncParamsRef.current.s
        const totalSeconds = normalizeTimeParts({
          minutes: nextMinutes,
          seconds: nextSeconds,
        }).totalSeconds

        updateActiveRow((row) => ({
          ...row,
          totalSeconds,
        }))
        return
      }
    },
    [applyParamPatch, updateActiveRow],
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
      rows: syncParamsRef.current.rows.map((row, index) =>
        index === syncParamsRef.current.activeIndex
          ? {
              ...row,
              totalSeconds: normalizedTime.totalSeconds,
            }
          : row,
      ),
    })
  }, [applyParamPatch])

  const handleActivateSequenceRow = useCallback(
    (rowIndex: number) => {
      timer.activateRow(rowIndex)
    },
    [timer],
  )

  const handleSelectSequenceRow = useCallback(
    (rowIndex: number) => {
      applyParamPatch({ activeIndex: rowIndex })
      timer.activateRow(rowIndex)
    },
    [applyParamPatch, timer],
  )

  const handleSequenceChange = useCallback(
    (nextChange: { activeIndex: number; rows: SyncParams["rows"] }) => {
      applyParamPatch(buildTimerSequenceChange(nextChange))
    },
    [applyParamPatch],
  )

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
    if (typeof window === "undefined") {
      return
    }

    const storedValue = window.localStorage.getItem(
      SHARE_PANEL_SETTINGS_STORAGE_KEY,
    )
    if (storedValue === "0") {
      setIncludeSettingsInShareUrls(false)
    } else if (storedValue === "1") {
      setIncludeSettingsInShareUrls(true)
    }
    setHasLoadedShareSettingsPreference(true)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !hasLoadedShareSettingsPreference) {
      return
    }

    window.localStorage.setItem(
      SHARE_PANEL_SETTINGS_STORAGE_KEY,
      includeSettingsInShareUrls ? "1" : "0",
    )
  }, [hasLoadedShareSettingsPreference, includeSettingsInShareUrls])

  useEffect(() => {
    document.title = buildDocumentTitle({
      appTitle: tAppShell("metadata.title"),
      pageTitle,
    })
  }, [pageTitle, tAppShell])

  useEffect(() => {
    if (!pendingTimerParamPatch) {
      return
    }

    applyParamPatch(pendingTimerParamPatch)
    setPendingTimerParamPatch(null)
  }, [applyParamPatch, pendingTimerParamPatch])

  useEffect(() => {
    if (!pendingTimerCommand) {
      return
    }

    syncAll({
      command:
        pendingTimerCommand === "activate"
          ? {
              activeIndex: syncParamsRef.current.activeIndex,
              type: "activate",
            }
          : { type: pendingTimerCommand },
      includeParams: false,
    })
    setPendingTimerCommand(null)
  }, [pendingTimerCommand, syncAll, syncParamsRef])

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
      event.returnValue = t("otherClientsBeforeUnload")
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [hasOtherConnectedClients, isControlCapableClient, t])

  const { readonlyPlaceholder, ...sessionDiagnostics } = useSessionDiagnostics({
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
    onOpenStatusPanel: openStatusPanel,
    params,
    participants,
    pathname,
    peerEventTimeline,
    remoteError,
    remoteLinkError,
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

  const clearEndedLiveSession = () => {
    clearRecentlyEndedLiveSession()
  }

  const settingsOmitKeys = includeSettingsInShareUrls
    ? []
    : getSettingsOnlyOmitKeys()
  const timerUrl = paramData.getUrlWithParams({
    omit: settingsOmitKeys,
  })
  const readonlyClientUrl =
    remoteSession.accessTokens && typeof window !== "undefined"
      ? paramData.getUrlWithParams({
          omit: [
            ...getRemoteSessionOnlyOmitKeys(
              shareableParams,
              [],
              `/view/${remoteSession.accessTokens.readonly}`,
            ),
            ...settingsOmitKeys,
          ],
          pathname: `/view/${remoteSession.accessTokens.readonly}`,
        })
      : ""
  const controlClientUrl =
    remoteSession.accessTokens && typeof window !== "undefined"
      ? paramData.getUrlWithParams({
          omit: [
            ...getRemoteSessionOnlyOmitKeys(
              shareableParams,
              [],
              `/control/${remoteSession.accessTokens.control}`,
            ),
            ...settingsOmitKeys,
          ],
          pathname: `/control/${remoteSession.accessTokens.control}`,
        })
      : ""

  return (
    <>
      <main
        aria-label={title.trim() || tAppShell("metadata.title")}
        className="h-full"
      >
        <TimerAnnouncements
          activeIndex={params.activeIndex}
          isPaused={timer.isPaused}
          isStarted={timer.isStarted}
          isTimedOut={timer.isTimedOut}
          minutes={minutes}
          seconds={seconds}
          sessionAccessibilityLabel={
            sessionDiagnostics.sessionPresentation.accessibilityLabel
          }
          stepTitle={params.title}
          totalDuration={timer.totalDuration}
          ttsEnabled={params.tts}
        />
        <Timer
          activeIndex={params.activeIndex}
          handleChange={handleChange}
          handleTimeBlur={normalizeTimerInputs}
          isReadonly={isReadonlyClient}
          onSelectSequenceRow={handleSelectSequenceRow}
          readonlyPlaceholder={readonlyPlaceholder}
          rows={params.rows}
          timer={timer}
          title={title}
        />
        <TopRightControls
          floatingTimerData={sessionDiagnostics.floatingTimerData}
          isReadonlyClient={isReadonlyClient}
          isSharePanelOpen={isSharePanelOpen}
          onOpenSharePanel={openStatusOrSharePanel}
          sidebarOffcanvasId={sidebarOffcanvasId}
        />
      </main>
      <Sidebar
        settingsPanel={{
          floatingTimerData: sessionDiagnostics.floatingTimerData,
          handleChange,
          params: {
            bg: params.bg,
            fg: params.fg,
            snd: params.snd,
            tts: params.tts,
          },
        }}
        sharePanel={{
          panelProps: {
            accessTokens: remoteSession.accessTokens,
            controlClientUrl,
            includeSettingsInLinks: includeSettingsInShareUrls,
            onEndRemoteSession: handleEndRemoteSession,
            onIncludeSettingsInLinksChange: setIncludeSettingsInShareUrls,
            onStartRemoteSession: async () => {
              await connectRemote()
            },
            readonlyClientUrl,
            timerUrl,
          },
          remoteRole,
        }}
        shell={{
          isPinnedOpen: isSidebarPinnedOpen,
          selectedEntryId: selectedSidebarEntryId,
          setIsPinnedOpen: setIsSidebarPinnedOpen,
          setSelectedEntryId: setSelectedSidebarEntryId,
          sidebarOffcanvasId,
        }}
        statusPanelData={{
          activityLog: peerEventTimeline,
          connectionDetails,
          errorText: sessionDiagnostics.remoteErrorText,
          floatingTimerErrorText: sessionDiagnostics.floatingTimerErrorText,
          getErrorReportBody: sessionDiagnostics.getErrorReportBody,
          isOnline: sessionDiagnostics.isOnline,
          isRetrying: lifecycleState === "reconnecting",
          localClientId,
          onRetry: retryConnection,
          participants,
          relayLabel: sessionDiagnostics.relayLabel,
          relayReachability: sessionDiagnostics.relayReachability,
          sessionId,
          sessionPresentation: sessionDiagnostics.sessionPresentation,
        }}
        timerPanel={{
          activeIndex: params.activeIndex,
          onActivateSequenceRow: handleActivateSequenceRow,
          onPageTitleChange: paramData.setPageTitle,
          onSequenceChange: handleSequenceChange,
          pageTitle,
          params,
        }}
      />
      <StatusBadge
        connectionCount={connectionCount}
        errorText={sessionDiagnostics.remoteErrorText}
        floatingTimerErrorText={sessionDiagnostics.floatingTimerErrorText}
        isOnline={sessionDiagnostics.isOnline}
        onOpenSharePanel={openStatusOrSharePanel}
        relayReachability={sessionDiagnostics.relayReachability}
        sessionId={sessionId}
        sessionPresentation={sessionDiagnostics.sessionPresentation}
      />
      {exitConfirmationDialog ? (
        <ActionDialog
          actions={exitConfirmationDialog.actions}
          description={exitConfirmationDialog.description}
          eyebrow={exitConfirmationDialog.eyebrow}
          role="alertdialog"
          title={exitConfirmationDialog.title}
        />
      ) : null}
      {recoveryDialog ? (
        <SyncConflictDialog
          actions={recoveryDialog.actions}
          description={recoveryDialog.description}
          getDeveloperReportBody={sessionDiagnostics.getErrorReportBody}
          title={recoveryDialog.title}
        />
      ) : null}
      {hasRecentlyEndedLiveSession ? (
        <ActionDialog
          actions={[
            {
              label: t("dismiss"),
              onClick: clearEndedLiveSession,
              tone: "primary",
            },
          ]}
          description={t("liveSessionEndedDescription")}
          role="dialog"
          title={t("liveSessionEndedTitle")}
        />
      ) : null}
    </>
  )
}
