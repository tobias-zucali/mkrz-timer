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
import { useLocale, useTranslations } from "next-intl"

import ActionDialog from "@/components/ActionDialog"
import Sidebar from "@/components/Sidebar"
import StatusBadge from "@/components/StatusBadge"
import SyncConflictDialog from "@/components/SyncConflictDialog"
import Timer from "@/components/Timer"
import TopRightControls from "@/components/TimerPageTopRightControls"
import ManualSaveDialog from "@/features/TimerPage/settings/ManualSaveDialog"
import RecentTimersDialog from "@/features/TimerPage/settings/RecentTimersDialog"
import TimerAnnouncements from "@/features/TimerPage/settings/TimerAnnouncements"
import { getInfoPagePath } from "@/features/InfoPages/routes"
import type { AppLocale } from "@/i18n/config"
import type { SyncParams } from "@/shared/liveSession/types"
import { mergeSyncParamsPatch } from "@/shared/liveSession/mergeSyncParamsPatch"
import {
  DEFAULT_SYNC_PARAMS,
  normalizeSyncParams,
} from "@/shared/security/input"
import { parseRemoteRoute } from "@/utils/liveSession/route"
import { buildTimerSequenceChange } from "@/utils/timerSequenceEditor"
import { isPromotedHostControlClient } from "@/utils/timerPage/routeTransition"
import usePromoteHostControlRoute from "@/utils/liveSession/timerPage/client/usePromoteHostControlRoute"
import useLiveSessionDialogs from "@/utils/timerPage/useLiveSessionDialogs"
import useSessionDiagnostics from "@/utils/timerPage/useSessionDiagnostics"
import useTimerChromeVisibility from "@/utils/timerPage/useTimerChromeVisibility"
import useTimerPageLiveSession from "@/utils/liveSession/timerPage/sync/useTimerPageLiveSession"
import {
  buildEmptyStoredTimerLibrary,
  buildStoredTimerFingerprint,
  createCurrentStoredTimerEntry,
  deleteStoredTimerEntry,
  initializeStoredTimerLibrary,
  readStoredTimerLibrary,
  selectStoredTimerEntry,
  type StoredTimerSnapshot,
  upsertCurrentStoredTimerEntry,
  writeStoredTimerLibrary,
} from "@/utils/timerLibrary"
import { buildDocumentTitle } from "@/utils/documentTitle"
import { normalizeTimeParts } from "@/utils/timeInputHelpers"
import useParams from "@/utils/useParams"
import {
  getRemoteSessionOnlyOmitKeys,
  getSettingsOnlyOmitKeys,
} from "@/utils/useParams/params"
import useTimer, { type TimerActions, type TimerState } from "@/utils/useTimer"
import useDebouncedEffect from "@/utils/useDebouncedEffect"

const SHARE_PANEL_SETTINGS_STORAGE_KEY = "timer.share.includeVoiceSoundSettings"
const TIMER_LIBRARY_DEBOUNCE_MS = 300
const EMPTY_STORED_TIMER_FINGERPRINT = buildStoredTimerFingerprint({
  pageTitle: "",
  params: DEFAULT_SYNC_PARAMS,
})
export default function TimerPage() {
  return (
    <Suspense fallback={null}>
      <TimerApp />
    </Suspense>
  )
}

function TimerApp() {
  const locale = useLocale() as AppLocale
  const t = useTranslations("TimerPage.page")
  const tAppShell = useTranslations("AppShell")
  const tInfoPages = useTranslations("InfoPages")
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
    | "activate"
    | "decrease-minute"
    | "increase-minute"
    | "next"
    | "pause"
    | "previous"
    | "reset"
    | "start"
    | null
  >(null)
  const [storedTimerLibrary, setStoredTimerLibrary] = useState(() =>
    buildEmptyStoredTimerLibrary(),
  )
  const [
    hasInitializedStoredTimerLibrary,
    setHasInitializedStoredTimerLibrary,
  ] = useState(false)
  const [isRecentTimersDialogOpen, setIsRecentTimersDialogOpen] =
    useState(false)
  const [isManualSaveDialogOpen, setIsManualSaveDialogOpen] = useState(false)
  const { isControlsActive } = useTimerChromeVisibility()

  const mapTimerActionToCommand = (action: TimerActions) => {
    if (action === "restart") {
      return "reset" as const
    }

    if (
      action === "activate" ||
      action === "decrease-minute" ||
      action === "increase-minute" ||
      action === "next" ||
      action === "pause" ||
      action === "previous" ||
      action === "start"
    ) {
      return action
    }

    return null
  }

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
  const storedTimerSnapshot = useMemo(
    () =>
      ({
        pageTitle,
        params,
      }) satisfies StoredTimerSnapshot,
    [pageTitle, params],
  )
  const hasTimerChanges = useMemo(
    () =>
      buildStoredTimerFingerprint(storedTimerSnapshot) !==
      EMPTY_STORED_TIMER_FINGERPRINT,
    [storedTimerSnapshot],
  )
  const timer = useTimer({
    canMutate: !isReadonlyClient,
    onAction: (action, payload) => {
      if (payload.params) {
        setPendingTimerParamPatch(payload.params)
      }
      setPendingTimerCommand(mapTimerActionToCommand(action))
    },
    params: syncParams,
    sequenceAuthority: remoteRole !== null ? "server" : "client",
    syncParamsRef,
    shortcutsEnabled: !isReadonlyClient,
    syncStateRef,
  })
  const { elapsedPercentage, isFinished, minutes, seconds, setState } = timer

  const { liveSession, remoteLinkError } = useTimerPageLiveSession({
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
  } = liveSession

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
  const tTimerPanel = useTranslations("Sidebar.timer")

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

  const { exitConfirmationDialog, handleEndRemoteSession, recoveryDialog } =
    useLiveSessionDialogs({
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
    if (remoteRoute.isRemote || !hasRecentlyEndedLiveSession) {
      return
    }

    setHasRecentlyEndedLiveSession(false)
  }, [hasRecentlyEndedLiveSession, remoteRoute.isRemote])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    if (window.location.hash !== "#share") {
      return
    }

    openStatusOrSharePanel()
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    )
  }, [openStatusOrSharePanel])

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
    locale,
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
      isFinished,
      minutes,
      primaryColor: pc,
      seconds,
      title,
    },
  })

  const settingsOmitKeys = includeSettingsInShareUrls
    ? []
    : getSettingsOnlyOmitKeys()
  const timerUrl = paramData.getUrlWithParams({
    omit: settingsOmitKeys,
    pathname: `/${locale}/t`,
  })
  const readonlyClientUrl =
    liveSession.accessTokens && typeof window !== "undefined"
      ? paramData.getUrlWithParams({
          omit: [
            ...getRemoteSessionOnlyOmitKeys(
              shareableParams,
              [],
              `/${locale}/join/${liveSession.accessTokens.readonly}`,
            ),
            ...settingsOmitKeys,
          ],
          pathname: `/${locale}/join/${liveSession.accessTokens.readonly}`,
        })
      : ""
  const controlClientUrl =
    liveSession.accessTokens && typeof window !== "undefined"
      ? paramData.getUrlWithParams({
          omit: [
            ...getRemoteSessionOnlyOmitKeys(
              shareableParams,
              [],
              `/${locale}/manage/${liveSession.accessTokens.control}`,
            ),
            ...settingsOmitKeys,
          ],
          pathname: `/${locale}/manage/${liveSession.accessTokens.control}`,
        })
      : ""

  useEffect(() => {
    if (hasInitializedStoredTimerLibrary) {
      return
    }

    if (typeof window === "undefined" || isReadonlyClient) {
      setHasInitializedStoredTimerLibrary(true)
      return
    }

    const persistedLibrary = readStoredTimerLibrary(window.localStorage)

    const initialLibrary = initializeStoredTimerLibrary({
      library: persistedLibrary,
      snapshot: storedTimerSnapshot,
    })

    setStoredTimerLibrary(initialLibrary)
    writeStoredTimerLibrary(initialLibrary, window.localStorage)
    setHasInitializedStoredTimerLibrary(true)
  }, [hasInitializedStoredTimerLibrary, isReadonlyClient, storedTimerSnapshot])

  useDebouncedEffect(() => {
    if (
      typeof window === "undefined" ||
      isReadonlyClient ||
      !hasInitializedStoredTimerLibrary
    ) {
      return
    }

    setStoredTimerLibrary((currentLibrary) => {
      const nextLibrary = upsertCurrentStoredTimerEntry({
        library: currentLibrary,
        snapshot: storedTimerSnapshot,
      })

      writeStoredTimerLibrary(nextLibrary, window.localStorage)
      return nextLibrary
    })
  }, TIMER_LIBRARY_DEBOUNCE_MS)

  const handleSelectStoredTimer = useCallback(
    (entryId: string) => {
      setStoredTimerLibrary((currentLibrary) => {
        const selectedEntry =
          currentLibrary.entries.find((entry) => entry.id === entryId) ?? null
        if (!selectedEntry) {
          return currentLibrary
        }

        if (
          buildStoredTimerFingerprint(selectedEntry) ===
          buildStoredTimerFingerprint(storedTimerSnapshot)
        ) {
          return currentLibrary
        }

        paramData.setPageTitle(selectedEntry.pageTitle)
        paramData.setParams(selectedEntry.params)

        const nextLibrary = selectStoredTimerEntry({
          entryId,
          library: currentLibrary,
        })
        writeStoredTimerLibrary(nextLibrary, window.localStorage)
        return nextLibrary
      })
      setIsRecentTimersDialogOpen(false)
    },
    [paramData, storedTimerSnapshot],
  )

  const handleDeleteStoredTimer = useCallback(
    (entryId: string) => {
      setStoredTimerLibrary((currentLibrary) => {
        const deletedResult = deleteStoredTimerEntry({
          entryId,
          fallbackSnapshot: {
            pageTitle: "",
            params: DEFAULT_SYNC_PARAMS,
          },
          library: currentLibrary,
        })

        writeStoredTimerLibrary(deletedResult.library, window.localStorage)

        if (
          entryId === currentLibrary.currentEntryId &&
          deletedResult.nextEntry
        ) {
          paramData.setPageTitle(deletedResult.nextEntry.pageTitle)
          paramData.setParams(deletedResult.nextEntry.params)
        }

        return deletedResult.library
      })
    },
    [paramData],
  )

  const handleCreateStoredTimerEntry = useCallback(
    (snapshot: StoredTimerSnapshot) => {
      setStoredTimerLibrary((currentLibrary) => {
        const nextLibrary = createCurrentStoredTimerEntry({
          library: currentLibrary,
          snapshot,
        })

        writeStoredTimerLibrary(nextLibrary, window.localStorage)
        return nextLibrary
      })
      paramData.setPageTitle(snapshot.pageTitle)
      paramData.setParams(snapshot.params)
    },
    [paramData],
  )

  const handleDuplicateCurrentTimer = useCallback(() => {
    const trimmedPageTitle = pageTitle.trim()
    const duplicatePageTitle = trimmedPageTitle
      ? `${trimmedPageTitle} ${tTimerPanel("copySuffix")}`
      : tTimerPanel("pageTitlePlaceholder")

    handleCreateStoredTimerEntry({
      pageTitle: duplicatePageTitle,
      params,
    })
  }, [handleCreateStoredTimerEntry, pageTitle, params, tTimerPanel])

  const handleNewTimer = useCallback(() => {
    handleCreateStoredTimerEntry({
      pageTitle: "",
      params: DEFAULT_SYNC_PARAMS,
    })
  }, [handleCreateStoredTimerEntry])

  return (
    <>
      <main
        aria-label={title.trim() || tAppShell("metadata.title")}
        className="h-full overflow-hidden overscroll-none"
      >
        <TimerAnnouncements
          activeIndex={params.activeIndex}
          isPaused={timer.isPaused}
          isStarted={timer.isStarted}
          isFinished={timer.isFinished}
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
          isControlsDimmed={!isControlsActive}
          isReadonly={isReadonlyClient}
          onSelectSequenceRow={handleSelectSequenceRow}
          readonlyPlaceholder={readonlyPlaceholder}
          rows={params.rows}
          timer={timer}
          title={title}
        />
        <TopRightControls
          floatingTimerData={sessionDiagnostics.floatingTimerData}
          isDimmed={!isControlsActive}
          isReadonlyClient={isReadonlyClient}
          isSharePanelOpen={isSharePanelOpen}
          onOpenSharePanel={openStatusOrSharePanel}
          sidebarOffcanvasId={sidebarOffcanvasId}
        />
      </main>
      <Sidebar
        locale={locale}
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
            accessTokens: liveSession.accessTokens,
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
          isDimmed: !isControlsActive,
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
          hasTimerChanges,
          onActivateSequenceRow: handleActivateSequenceRow,
          onDuplicateCurrentTimer: handleDuplicateCurrentTimer,
          onOpenLoadRecentDialog: () => setIsRecentTimersDialogOpen(true),
          onNewTimer: handleNewTimer,
          onPageTitleChange: paramData.setPageTitle,
          onOpenSaveDialog: () => setIsManualSaveDialogOpen(true),
          onSequenceChange: handleSequenceChange,
          pageTitle,
          params,
          currentEntryId: storedTimerLibrary.currentEntryId,
          storedTimerCount: storedTimerLibrary.entries.length,
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
      {isManualSaveDialogOpen ? (
        <ManualSaveDialog
          controlClientUrl={controlClientUrl}
          onClose={() => setIsManualSaveDialogOpen(false)}
          pageTitle={pageTitle}
          readonlyClientUrl={readonlyClientUrl}
          rows={params.rows}
          timerUrl={timerUrl}
        />
      ) : null}
      {isRecentTimersDialogOpen ? (
        <RecentTimersDialog
          currentEntryId={storedTimerLibrary.currentEntryId}
          entries={storedTimerLibrary.entries}
          onClose={() => setIsRecentTimersDialogOpen(false)}
          onDelete={handleDeleteStoredTimer}
          onSelect={handleSelectStoredTimer}
        />
      ) : null}
      <footer
        className="
          absolute inset-x-4 bottom-4 z-10 flex flex-wrap items-center
          justify-end gap-2 text-sm
        "
      >
        <a className="underline hover:text-primary" href="https://www.mkrz.at/">
          {tAppShell("footer.credit")}
        </a>
        <span className="text-foreground/72" aria-hidden="true">
          ·
        </span>
        <a
          className="
            cursor-pointer text-foreground/78 underline transition
            hover:text-primary focus:outline-2 focus:-outline-offset-2
            focus:outline-primary
          "
          href={getInfoPagePath(locale, "about")}
        >
          {tInfoPages("footer.about")}
        </a>
      </footer>
    </>
  )
}
