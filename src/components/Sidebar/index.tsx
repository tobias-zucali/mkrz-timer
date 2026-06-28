"use client"

import {
  type Dispatch,
  type ReactElement,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react"

import classNames from "classnames"
import Link from "next/link"
import { useTranslations } from "next-intl"

import CloseButton from "@/components/CloseButton"
import IconButton from "@/components/IconButton"
import OverlayBackdrop from "@/components/OverlayBackdrop"
import SettingsPanel, {
  type SettingsPanelProps,
} from "@/components/Sidebar/SettingsPanel"
import SharePanel, {
  type SharePanelProps,
} from "@/components/Sidebar/SharePanel"
import StatusPanel, {
  type StatusPanelProps,
} from "@/components/Sidebar/StatusPanel"
import TimerPanel, {
  type TimerPanelProps,
} from "@/components/Sidebar/TimerPanel"
import Wordmark from "@/components/Wordmark"
import { getCompactStatusAppearance } from "@/components/StatusBadge/statusHelpers"
import type { AppLocale } from "@/i18n/config"
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

type SidebarEntryId = "settings" | "share" | "status" | "timer"

type SidebarEntry = {
  icon: ReactElement
  id: SidebarEntryId
  label: string
}

type SidebarShellProps = {
  isDimmed?: boolean
  isPinnedOpen: boolean
  selectedEntryId: SidebarEntryId | null
  setIsPinnedOpen: Dispatch<SetStateAction<boolean>>
  setSelectedEntryId: Dispatch<SetStateAction<SidebarEntryId | null>>
  sidebarOffcanvasId?: string
}

type SidebarSharePanelProps = {
  panelProps: Omit<SharePanelProps, "onRetry" | "sessionPresentation">
  remoteRole: "control" | "readonly" | null
}

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
  const t = useTranslations("Sidebar")

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="text-sm/6 text-ink/68">{t("readonlyUnsupported")}</p>
    </div>
  )
}

export default function Sidebar({
  locale,
  shell,
  settingsPanel,
  statusPanelData,
  sharePanel,
  timerPanel,
}: {
  locale: AppLocale
  shell: SidebarShellProps
  settingsPanel: SettingsPanelProps
  sharePanel: SidebarSharePanelProps
  statusPanelData: StatusPanelProps
  timerPanel: TimerPanelProps
}) {
  const generatedOffcanvasId = useId()
  const t = useTranslations("Sidebar")
  const tAppShell = useTranslations("AppShell")
  const isNarrowViewport = useIsNarrowViewport()
  const offcanvasRef = useRef<HTMLDivElement>(null)
  const menuCloseButtonRef = useRef<HTMLButtonElement>(null)
  const panelCloseButtonRef = useRef<HTMLButtonElement>(null)
  const {
    isDimmed = false,
    isPinnedOpen,
    selectedEntryId,
    setIsPinnedOpen,
    setSelectedEntryId,
    sidebarOffcanvasId,
  } = shell
  const { panelProps: sharePanelProps, remoteRole } = sharePanel
  const { floatingTimerData, handleChange } = settingsPanel
  const timerEntryLabel = timerPanel.pageTitle.trim() || t("entries.timer")

  const mainEntries: SidebarEntry[] = [
    {
      icon: <ClockIcon className="size-4" />,
      id: "timer",
      label: timerEntryLabel,
    },
    {
      icon: <ShareIcon className="size-4" />,
      id: "share",
      label: t("entries.share"),
    },
    {
      icon: <CogIcon className="size-4" />,
      id: "settings",
      label: t("entries.settings"),
    },
  ]

  const isOpen = isPinnedOpen
  const isOverlayActive = isPinnedOpen || selectedEntryId !== null
  const isReadonlySidebar = remoteRole === "readonly"
  const offcanvasId = sidebarOffcanvasId ?? generatedOffcanvasId

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

  const openSharePanel = () => {
    openEntry("share")
  }

  const isFullscreenSidebar = isReadonlySidebar || isNarrowViewport

  const getPanelHeading = useCallback(
    (entry: SidebarEntryId) => {
      switch (entry) {
        case "timer":
          return timerEntryLabel
        case "share":
          return t("entries.share")
        case "settings":
          return t("entries.settings")
        case "status":
          return t("entries.status")
      }
    },
    [t, timerEntryLabel],
  )

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
    isOnline: statusPanelData.isOnline,
    isWaitingForController:
      statusPanelData.sessionPresentation.isWaitingForController,
    relayReachability: statusPanelData.relayReachability,
    state: statusPanelData.sessionPresentation.state,
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
      label: t("entries.status"),
    },
  ]

  const sidebarBaseItemClassName =
    "flex w-full cursor-pointer items-center gap-x-3 rounded-lg border border-transparent px-2.5 py-2 text-left text-base font-semibold text-ink/74 transition hover:border-primary/50 hover:text-ink focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
  const selectedSidebarItemClassName =
    "relative z-10 -mr-2 border-primary/40 bg-primary text-ink hover:bg-primary-hover hover:border-primary/40"

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
        return <TimerPanel {...timerPanel} />
      case "share":
        return (
          <SharePanel
            onRetry={statusPanelData.onRetry}
            sessionPresentation={statusPanelData.sessionPresentation}
            {...sharePanelProps}
          />
        )
      case "settings":
        return (
          <SettingsPanel
            floatingTimerData={floatingTimerData}
            handleChange={handleChange}
            params={settingsPanel.params}
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
        ? timerEntryLabel
        : selectedEntry === "share"
          ? t("entries.share")
          : selectedEntry === "settings"
            ? t("entries.settings")
            : t("entries.status")
    const readonlyPanelContent =
      selectedEntry === "status" ? (
        <StatusPanel {...statusPanelData} />
      ) : (
        <ReadonlyUnsupportedPlaceholder title={readonlyPanelTitle} />
      )

    return (
      <div className="pointer-events-none fixed inset-0 z-30">
        {isOverlayActive && (
          <OverlayBackdrop
            ariaLabel={t("closeSidebar")}
            className="
              pointer-events-auto opacity-100 transition-opacity duration-300
              motion-reduce:transition-none
            "
            onClick={closeSidebar}
          />
        )}
        <div
          className={classNames(
            "absolute inset-y-0 left-0 pointer-events-auto flex max-w-full -translate-x-full transform overflow-hidden shadow-2xl transition-none duration-0",
            isOpen && "translate-x-0",
            selectedEntry ? "right-0 w-full" : "hidden w-0",
          )}
          aria-labelledby={
            selectedEntry ? `sidebar-panel-${selectedEntry}` : undefined
          }
          data-testid="sidebar-offcanvas"
          id={offcanvasId}
          ref={offcanvasRef}
          role="dialog"
          tabIndex={-1}
        >
          <div className="size-full overflow-hidden bg-screen/96 backdrop-blur-xl">
            {selectedEntry && (
              <div
                className="
                  relative flex h-full min-h-0 min-w-0 flex-col overflow-y-auto
                  px-5 pt-5 sm:px-7 sm:pt-6
                "
                data-testid={`sidebar-panel-${selectedEntry}`}
              >
                <div className="sticky top-0 z-10 ml-auto">
                  <h2 className="sr-only" id={`sidebar-panel-${selectedEntry}`}>
                    {getPanelHeading(selectedEntry)}
                  </h2>
                  <CloseButton
                    className="
                      size-6 rounded-full border-ink/14 bg-card
                      text-ink/60 shadow-sm hover:bg-input-bg hover:text-ink
                    "
                    onClick={closeSidebar}
                    ref={panelCloseButtonRef}
                    title={t("closeSidebar")}
                    {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
                  />
                </div>
                <div className="min-h-0 flex-1 pr-1 pb-16">
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
        <OverlayBackdrop
          ariaLabel={t("closeSidebar")}
          className="
            pointer-events-auto opacity-100 transition-opacity duration-300
            motion-reduce:transition-none
          "
          onClick={closeSidebar}
        />
      )}
      <div className="absolute top-3 left-3 md:top-4 md:left-4">
        <IconButton
          appearance="ghost"
          aria-controls={offcanvasId}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={t("toggleNavigation")}
          className={classNames(
            "pointer-events-auto border border-ink/16 bg-screen/58 backdrop-blur-xs shadow-sm",
            "timer-chrome-transition hover:border-ink/28 hover:bg-screen/92 hover:text-ink",
            isDimmed && "timer-chrome-dimmed",
            isOpen && "border-primary/45",
          )}
          data-timer-chrome-focus-lock="true"
          isActive={isOpen}
          onClick={toggleSidebar}
          shape="soft"
          size="nav"
          title={t("toggleNavigation")}
          {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
        >
          <Bars3Icon className="size-4" />
        </IconButton>
      </div>
      <div
        className={classNames(
          "absolute inset-y-0 left-0 pointer-events-auto flex max-w-full -translate-x-full transform overflow-hidden shadow-2xl transition-transform duration-300",
          isOpen && "translate-x-0",
          selectedEntry ? "right-0 w-full sm:w-208" : "right-0 w-full sm:w-64",
        )}
        data-testid="sidebar-offcanvas"
        id={offcanvasId}
        ref={offcanvasRef}
        role="dialog"
        tabIndex={-1}
      >
        <div
          className={classNames(
            "flex h-full w-full shrink-0 flex-col border-r border-ink/10 bg-screen/96 sm:w-64",
            selectedEntry ? "sm:flex" : "",
            selectedEntry && "hidden sm:flex",
          )}
        >
          <header className="flex items-center justify-between gap-3 border-b border-ink/10 p-4">
            <Link
              aria-label={tAppShell("metadata.title")}
              className="underline-offset-4 hover:underline focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
              href={`/${locale}`}
            >
              <Wordmark onDark size="sm" />
            </Link>
            <CloseButton
              className="sm:hidden"
              onClick={closeSidebar}
              ref={menuCloseButtonRef}
              title={t("closeSidebarMenu")}
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
                      type="button"
                      {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
                    >
                      <span className="shrink-0 text-ink/82">{entry.icon}</span>
                      <span>{entry.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <ul className="mt-auto space-y-1 border-t border-ink/10 pt-3">
              <li>
                <button
                  className="
                    flex w-full cursor-pointer flex-col items-start gap-1
                    rounded-lg border border-transparent px-2.5 py-3 text-left
                    transition hover:border-primary/50 focus:outline-2
                    focus:-outline-offset-2 focus:outline-primary
                  "
                  onClick={openSharePanel}
                  type="button"
                  {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
                >
                  <span
                    className="
                      text-[0.68rem] font-semibold tracking-[0.14em]
                      text-ink/58 uppercase
                    "
                  >
                    {statusPanelData.sessionPresentation.sidebarStatus.eyebrow}
                  </span>
                  <span className="text-sm font-semibold text-ink/84">
                    {statusPanelData.sessionPresentation.sidebarStatus.label}
                  </span>
                </button>
              </li>
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
                      type="button"
                      {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
                    >
                      <span className="shrink-0 text-ink/82">{entry.icon}</span>
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
            "h-full min-w-0 overflow-hidden bg-screen/96 backdrop-blur-xl",
            selectedEntry && isOpen
              ? "absolute inset-0 z-10 w-full border-l border-ink/10 sm:relative sm:z-0 sm:flex-1 sm:border-r"
              : "hidden w-0",
          )}
        >
          {selectedEntry && (
            <div
              className="
                relative flex h-full min-h-0 min-w-0 flex-col overflow-y-auto
                px-5 pt-6 sm:px-6 sm:pt-4
              "
              data-testid={`sidebar-panel-${selectedEntry}`}
            >
              <div className="ml-auto rounded-pill sm:sticky sm:top-0 sm:z-10 sm:mr-2 sm:mb-2 sm:border-2 sm:border-screen/96 sm:bg-screen/96 sm:backdrop-blur-xl">
                <h2 className="sr-only" id={`sidebar-panel-${selectedEntry}`}>
                  {getPanelHeading(selectedEntry)}
                </h2>
                <CloseButton
                  className="
                    size-6 rounded-full border-ink/14
                    text-ink/60 hover:text-ink
                  "
                  onClick={isNarrowViewport ? returnToMenu : closeSidebar}
                  ref={panelCloseButtonRef}
                  title={
                    isNarrowViewport
                      ? t("backToSidebarMenu")
                      : t("closeSidebar")
                  }
                  {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
                >
                  {isNarrowViewport ? (
                    <ChevronLeftIcon className="size-5" />
                  ) : undefined}
                </CloseButton>
              </div>
              <div className="min-h-0 min-w-0 pt-6 pr-1">
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
