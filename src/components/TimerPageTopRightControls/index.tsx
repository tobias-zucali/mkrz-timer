"use client"

import type { ReactNode } from "react"
import { useId, useState } from "react"
import { useTranslations } from "next-intl"

import QrCodeOverlay from "@/components/QrCodeOverlay"
import {
  ArrowsPointingOutIcon,
  ShareIcon,
  WindowIcon,
  XMarkIcon,
} from "@/utils/icons"
import useFullscreenState from "@/utils/timerPage/useFullscreenState"

function TopRightActionButton({
  ariaLabel,
  ariaControls,
  ariaExpanded,
  ariaHaspopup,
  ariaPressed,
  children,
  isActive = false,
  onClick,
  title,
}: {
  ariaLabel: string
  ariaControls?: string
  ariaExpanded?: boolean
  ariaHaspopup?: "dialog"
  ariaPressed?: boolean
  children: ReactNode
  isActive?: boolean
  onClick: () => void
  title: string
}) {
  return (
    <button
      aria-label={ariaLabel}
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHaspopup}
      aria-pressed={ariaPressed}
      className={[
        "inline-flex size-9 cursor-pointer items-center justify-center rounded-lg transition",
        "focus:outline-2 focus:-outline-offset-2 focus:outline-primary",
        isActive ? "text-primary" : "text-foreground/78 hover:text-primary",
      ].join(" ")}
      onClick={onClick}
      title={title}
      type="button"
    >
      {children}
    </button>
  )
}

export default function TopRightControls({
  floatingTimerData,
  isSharePanelOpen,
  isReadonlyClient,
  onOpenSharePanel,
  sidebarOffcanvasId,
}: {
  floatingTimerData: {
    isOpen: boolean
    isSupported: boolean
    toggle: () => Promise<void>
  }
  isSharePanelOpen: boolean
  isReadonlyClient: boolean
  onOpenSharePanel: () => void
  sidebarOffcanvasId: string
}) {
  const t = useTranslations("TopRightControls")
  const [isViewerShareQrCodeOpen, setIsViewerShareQrCodeOpen] = useState(false)
  const viewerShareQrCodeId = useId()
  const { isFullscreen, isFullscreenSupported, toggleFullscreen } =
    useFullscreenState()
  const viewerShareUrl =
    typeof window === "undefined" ? "" : window.location.href

  return (
    <>
      <div className="absolute top-0 right-0 z-20 m-2 hidden items-center rounded-lg bg-background/58 backdrop-blur-xs hover:bg-background/74 sm:flex">
        <TopRightActionButton
          ariaLabel={isReadonlyClient ? t("shareViewerLink") : t("openSharing")}
          ariaControls={
            isReadonlyClient ? viewerShareQrCodeId : sidebarOffcanvasId
          }
          ariaExpanded={
            isReadonlyClient ? isViewerShareQrCodeOpen : isSharePanelOpen
          }
          ariaHaspopup="dialog"
          isActive={
            isReadonlyClient ? isViewerShareQrCodeOpen : isSharePanelOpen
          }
          onClick={
            isReadonlyClient
              ? () => {
                  setIsViewerShareQrCodeOpen(true)
                }
              : onOpenSharePanel
          }
          title={t("share")}
        >
          <ShareIcon className="size-4" />
        </TopRightActionButton>
        {!isReadonlyClient && floatingTimerData.isSupported ? (
          <TopRightActionButton
            ariaLabel={t("toggleFloatingWindow")}
            ariaPressed={floatingTimerData.isOpen}
            isActive={floatingTimerData.isOpen}
            onClick={() => {
              void floatingTimerData.toggle()
            }}
            title={t("floatingWindow")}
          >
            <WindowIcon className="size-4" />
          </TopRightActionButton>
        ) : null}
        {!isReadonlyClient && isFullscreenSupported ? (
          <TopRightActionButton
            ariaLabel={
              isFullscreen ? t("exitFullscreen") : t("enterFullscreen")
            }
            onClick={toggleFullscreen}
            title={isFullscreen ? t("closeFullscreen") : t("fullscreenMode")}
          >
            {isFullscreen ? (
              <XMarkIcon className="size-4" />
            ) : (
              <ArrowsPointingOutIcon className="size-4" />
            )}
          </TopRightActionButton>
        ) : null}
      </div>
      {isReadonlyClient && isViewerShareQrCodeOpen && viewerShareUrl ? (
        <QrCodeOverlay
          label={t("viewerLink")}
          onClose={() => setIsViewerShareQrCodeOpen(false)}
          overlayId={viewerShareQrCodeId}
          value={viewerShareUrl}
        />
      ) : null}
    </>
  )
}
