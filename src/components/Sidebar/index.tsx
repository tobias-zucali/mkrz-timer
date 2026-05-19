"use client"

import {
  type Dispatch,
  type RefObject,
  type ReactElement,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react"

import classNames from "classnames"

import CloseButton from "@/components/CloseButton"
import SettingsPanel from "@/components/Sidebar/SettingsPanel"
import SharePanel from "@/components/Sidebar/SharePanel"
import StatusPanel from "@/components/Sidebar/StatusPanel"
import TimerPanel from "@/components/Sidebar/TimerPanel"
import { getCompactStatusAppearance } from "@/components/StatusBadge/statusHelpers"
import {
  Bars3Icon,
  ChevronLeftIcon,
  ClockIcon,
  CogIcon,
  ShareIcon,
} from "@/utils/icons"
import { getTimerSpaceShortcutButtonProps } from "@/utils/timerShortcutButtons"
import useDialogFocusTrap from "@/utils/useDialogFocusTrap"
import useIsNarrowViewport from "@/utils/useIsNarrowViewport"
import useParams from "@/utils/useParams"
import useRemoteSession from "@/utils/remoteSession"
import type { RemoteRelayReachabilityState } from "@/utils/remoteSession/useRemoteRelayReachability"
import type { RemoteStatusModel } from "@/utils/remoteStatus"
import type { FloatingTimerData } from "@/utils/useFloatingTimerPiP"

type SidebarEntryId = "settings" | "share" | "status" | "timer"

type SidebarEntry = {
  icon: ReactElement
  id: SidebarEntryId
  label: string
}

const mainEntries: SidebarEntry[] = [
  { icon: <ClockIcon className="h-4 w-4" />, id: "timer", label: "Timer" },
  { icon: <ShareIcon className="h-4 w-4" />, id: "share", label: "Share" },
  { icon: <CogIcon className="h-4 w-4" />, id: "settings", label: "Settings" },
]

function getDefaultFocusRef({
  closeButtonRef,
  isFullscreenSidebar,
  panelCloseButtonRef,
  selectedEntry,
}: {
  closeButtonRef: RefObject<HTMLButtonElement | null>
  isFullscreenSidebar: boolean
  panelCloseButtonRef: RefObject<HTMLButtonElement | null>
  selectedEntry: SidebarEntryId | null
}) {
  if (!isFullscreenSidebar) {
    return undefined
  }

  if (selectedEntry) {
    return panelCloseButtonRef
  }

  return closeButtonRef
}

function ReadonlyUnsupportedPlaceholder({ title }: { title: string }) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-6 text-foreground/68">
        View mode not supported.
      </p>
    </div>
  )
}

export default function Sidebar({
  handleChange,
  handleTimeBlur,
  isPinnedOpen,
  peerData,
  floatingTimerData,
  onEndRemoteSession,
  onStartRemoteSession,
  paramData,
  remoteRole,
  selectedEntryId,
  setIsPinnedOpen,
  setSelectedEntryId,
  statusPanelData,
}: {
  handleChange: (key: string, value: string) => void
  handleTimeBlur: () => void
  isPinnedOpen: boolean
  floatingTimerData: FloatingTimerData
  onEndRemoteSession: () => Promise<void>
  onStartRemoteSession: () => Promise<void>
  paramData: ReturnType<typeof useParams>
  peerData: ReturnType<typeof useRemoteSession>
  remoteRole: "control" | "readonly" | null
  selectedEntryId: SidebarEntryId | null
  setIsPinnedOpen: Dispatch<SetStateAction<boolean>>
  setSelectedEntryId: Dispatch<SetStateAction<SidebarEntryId | null>>
  statusPanelData: {
    activityLog: string[]
    connectionDetails: { id: string; isAlive: boolean }[]
    errorText: string | null
    floatingTimerErrorText: string | null
    getErrorReportBody: () => string
    isOnline: boolean | null
    isRetrying: boolean
    onRetry: () => void
    relayLabel: string
    relayReachability: RemoteRelayReachabilityState
    remoteStatus: RemoteStatusModel | null
    sessionId?: string
  }
}) {
  const isNarrowViewport = useIsNarrowViewport()
  const offcanvasRef = useRef<HTMLDivElement>(null)
  const menuCloseButtonRef = useRef<HTMLButtonElement>(null)
  const panelCloseButtonRef = useRef<HTMLButtonElement>(null)
  const { params, getUrlWithParams } = paramData
  const { accessTokens, error, isConnecting, sessionId } = peerData

  const isOpen = isPinnedOpen
  const isOverlayActive = isPinnedOpen || selectedEntryId !== null
  const remoteErrorText = error ? error.message : null
  const timerUrl = getUrlWithParams()
  const readonlyClientUrl =
    accessTokens && typeof window !== "undefined"
      ? new URL(
          `/view/${accessTokens.readonly}`,
          window.location.origin,
        ).toString()
      : ""
  const controlClientUrl =
    accessTokens && typeof window !== "undefined"
      ? new URL(
          `/control/${accessTokens.control}`,
          window.location.origin,
        ).toString()
      : ""
  const isRemoteReady = Boolean(sessionId)
  const isReadonlySidebar = remoteRole === "readonly"

  const selectedEntry = useMemo(
    () => selectedEntryId ?? null,
    [selectedEntryId],
  )

  useEffect(() => {
    if (!isOverlayActive) {
      return
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return
      }

      setIsPinnedOpen(false)
      setSelectedEntryId(null)
    }

    window.addEventListener("keyup", handleKeyUp)
    return () => window.removeEventListener("keyup", handleKeyUp)
  }, [isOverlayActive, setIsPinnedOpen, setSelectedEntryId])

  const closeSidebar = () => {
    setIsPinnedOpen(false)
    setSelectedEntryId(null)
  }

  const returnToMenu = () => {
    setSelectedEntryId(null)
  }

  const openEntry = (entryId: SidebarEntryId) => {
    setIsPinnedOpen(true)
    setSelectedEntryId(entryId)
  }

  const openStatusPanel = () => {
    openEntry("status")
  }
  const isFullscreenSidebar = isReadonlySidebar || isNarrowViewport

  useDialogFocusTrap({
    active: isOverlayActive && isFullscreenSidebar,
    defaultFocusRef: getDefaultFocusRef({
      closeButtonRef: menuCloseButtonRef,
      isFullscreenSidebar,
      panelCloseButtonRef,
      selectedEntry,
    }),
    dialogRef: offcanvasRef,
  })

  const statusSidebarAppearance = getCompactStatusAppearance({
    errorText:
      statusPanelData.errorText ?? statusPanelData.floatingTimerErrorText,
    hasRemoteStatus: Boolean(statusPanelData.remoteStatus),
    isOnline: statusPanelData.isOnline,
    relayReachability: statusPanelData.relayReachability,
    state: statusPanelData.remoteStatus?.state ?? "connected",
  })
  const StatusSidebarIcon = statusSidebarAppearance.icon
  const footerEntries: SidebarEntry[] = [
    {
      icon: (
        <StatusSidebarIcon
          className={classNames(
            "h-4 w-4",
            statusSidebarAppearance.iconClassName,
          )}
        />
      ),
      id: "status",
      label: "Status",
    },
  ]

  const sidebarBaseItemClassName =
    "flex w-full cursor-pointer items-center gap-x-3 rounded-lg border border-transparent px-2.5 py-2 text-left text-base font-semibold text-foreground/74 transition hover:border-primary/50 hover:text-foreground focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
  const selectedSidebarItemClassName =
    "relative z-10 -mr-2 border-primary/40 bg-primary text-background hover:border-primary/40 hover:text-background"

  const toggleSidebar = useCallback(() => {
    setIsPinnedOpen((current) => {
      const next = !current
      if (!next) {
        setSelectedEntryId(null)
      }
      return next
    })
  }, [setIsPinnedOpen, setSelectedEntryId])

  const renderSelectedPanel = () => {
    switch (selectedEntry) {
      case "timer":
        return (
          <TimerPanel
            handleChange={handleChange}
            handleTimeBlur={handleTimeBlur}
            params={params}
          />
        )
      case "share":
        return (
          <SharePanel
            accessTokens={accessTokens}
            controlClientUrl={controlClientUrl}
            isConnecting={isConnecting}
            isRemoteReady={isRemoteReady}
            onEndRemoteSession={onEndRemoteSession}
            onStartRemoteSession={onStartRemoteSession}
            readonlyClientUrl={readonlyClientUrl}
            remoteErrorText={remoteErrorText}
            remoteRole={remoteRole}
            sessionId={sessionId}
            onOpenStatusPanel={openStatusPanel}
            timerUrl={timerUrl}
          />
        )
      case "settings":
        return (
          <SettingsPanel
            floatingTimerData={floatingTimerData}
            handleChange={handleChange}
            params={params}
          />
        )
      case "status":
        return <StatusPanel {...statusPanelData} />
      case null:
        return null
    }
  }

  if (isReadonlySidebar) {
    const readonlyPanelTitle =
      selectedEntry === "timer"
        ? "Timer"
        : selectedEntry === "share"
          ? "Share"
          : selectedEntry === "settings"
            ? "Settings"
            : "Status"
    const readonlyPanelContent =
      selectedEntry === "status" ? (
        <StatusPanel {...statusPanelData} />
      ) : (
        <ReadonlyUnsupportedPlaceholder title={readonlyPanelTitle} />
      )

    return (
      <div className="pointer-events-none fixed inset-0 z-30">
        {isOverlayActive && (
          <button
            aria-label="Close sidebar"
            className="pointer-events-auto absolute inset-0 bg-foreground/10 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none opacity-100"
            onClick={closeSidebar}
            tabIndex={-1}
            type="button"
          />
        )}
        <div
          className={classNames(
            "absolute inset-y-0 left-0 pointer-events-auto flex max-w-full -translate-x-full transform overflow-hidden shadow-2xl transition-none duration-0",
            isOpen && "translate-x-0",
            selectedEntry ? "right-0 w-full" : "hidden w-0",
          )}
          data-testid="sidebar-offcanvas"
          id="sidebar-offcanvas"
          ref={offcanvasRef}
          role="dialog"
          tabIndex={-1}
        >
          <div
            aria-labelledby={
              selectedEntry ? `sidebar-panel-${selectedEntry}` : undefined
            }
            className="h-full w-full overflow-hidden bg-background/96 backdrop-blur-xl"
          >
            {selectedEntry && (
              <div
                className="relative flex h-full min-h-0 min-w-0 flex-col overflow-y-auto px-5 pt-5 sm:px-7 sm:pt-6"
                data-testid={`sidebar-panel-${selectedEntry}`}
              >
                <div className="sticky top-0 z-10 ml-auto">
                  <h2 className="sr-only" id={`sidebar-panel-${selectedEntry}`}>
                    {selectedEntry}
                  </h2>
                  <CloseButton
                    className="h-6 w-6 rounded-full border-foreground/14 bg-white/3 text-foreground/60 hover:bg-white/7 hover:text-foreground"
                    onClick={closeSidebar}
                    {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
                    ref={panelCloseButtonRef}
                    title="Close sidebar"
                  />
                </div>
                <div className="min-h-0 flex-1 pb-16 pr-1">
                  {readonlyPanelContent}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {isOverlayActive && (
        <button
          aria-label="Close sidebar"
          className="pointer-events-auto absolute inset-0 bg-foreground/10 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none opacity-100"
          onClick={closeSidebar}
          tabIndex={-1}
          type="button"
        />
      )}
      <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
        <button
          aria-controls="sidebar-offcanvas"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label="Toggle navigation"
          className={classNames(
            "pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-lg border",
            "border-foreground/16 bg-background/84 text-foreground/78 shadow-sm backdrop-blur",
            "transition hover:border-foreground/28 hover:bg-background/92 hover:text-foreground",
            "focus:outline-2 focus:-outline-offset-2 focus:outline-primary",
            isOpen && "border-primary/45 text-primary",
          )}
          onClick={toggleSidebar}
          {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
          type="button"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
      </div>
      <div
        className={classNames(
          "absolute inset-y-0 left-0 pointer-events-auto flex max-w-full -translate-x-full transform overflow-hidden shadow-2xl transition-transform duration-300",
          isOpen && "translate-x-0",
          selectedEntry ? "right-0 w-full sm:w-[52rem]" : "right-0 w-full sm:w-64",
        )}
        data-testid="sidebar-offcanvas"
        id="sidebar-offcanvas"
        ref={offcanvasRef}
        role="dialog"
        tabIndex={-1}
      >
        <div
          className={classNames(
            "flex h-full w-full shrink-0 flex-col border-r border-foreground/10 bg-background/96 sm:w-64",
            selectedEntry ? "sm:flex" : "",
            selectedEntry && "hidden sm:flex",
          )}
        >
          <header className="flex items-center justify-between gap-3 border-b border-foreground/10 px-4 py-4">
            <div className="text-xl font-semibold text-foreground">
              mkrz timer
            </div>
            <CloseButton
              className="sm:hidden"
              onClick={closeSidebar}
              ref={menuCloseButtonRef}
              title="Close sidebar menu"
            />
          </header>
          <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-3">
            <ul className="space-y-1">
              {mainEntries.map((entry) => {
                const isSelected = selectedEntryId === entry.id

                return (
                  <li key={entry.id}>
                    <button
                      className={classNames(
                        sidebarBaseItemClassName,
                        isSelected && selectedSidebarItemClassName,
                      )}
                      onClick={() => openEntry(entry.id)}
                      {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
                      type="button"
                    >
                      <span className="shrink-0 text-foreground/82">
                        {entry.icon}
                      </span>
                      <span>{entry.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <ul className="mt-auto space-y-1 border-t border-foreground/10 pt-3">
              {footerEntries.map((entry) => {
                const isSelected = selectedEntryId === entry.id

                return (
                  <li key={entry.id}>
                    <button
                      className={classNames(
                        sidebarBaseItemClassName,
                        isSelected && selectedSidebarItemClassName,
                      )}
                      onClick={() => openEntry(entry.id)}
                      {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
                      type="button"
                    >
                      <span className="shrink-0 text-foreground/82">
                        {entry.icon}
                      </span>
                      <span>{entry.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
        <div
          aria-labelledby={
            selectedEntry ? `sidebar-panel-${selectedEntry}` : undefined
          }
          className={classNames(
            "h-full min-w-0 overflow-hidden bg-background/96 backdrop-blur-xl",
            selectedEntry && isOpen
              ? "absolute inset-0 z-10 w-full border-l border-foreground/10 sm:relative sm:z-0 sm:flex-1 sm:border-r"
              : "hidden w-0",
          )}
        >
          {selectedEntry && (
            <div
              className={classNames(
                "relative flex h-full min-h-0 min-w-0 flex-col overflow-y-auto",
                "px-5 pt-6 sm:px-6 sm:pt-4",
              )}
              data-testid={`sidebar-panel-${selectedEntry}`}
            >
              <div className="sticky top-0 z-10 ml-auto">
                <h2 className="sr-only" id={`sidebar-panel-${selectedEntry}`}>
                  {selectedEntry}
                </h2>
                <CloseButton
                  className="h-6 w-6 rounded-full border-foreground/14 bg-white/3 text-foreground/60 hover:bg-white/7 hover:text-foreground"
                  onClick={isNarrowViewport ? returnToMenu : closeSidebar}
                  {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
                  ref={panelCloseButtonRef}
                  title={isNarrowViewport ? "Back to sidebar menu" : "Close sidebar"}
                >
                  {isNarrowViewport ? (
                    <ChevronLeftIcon className="h-5 w-5" />
                  ) : undefined}
                </CloseButton>
              </div>
              <div className="min-h-0 pt-6 pr-1">
                {renderSelectedPanel()}
                <div className="h-12"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
