"use client"

import type { ReactNode } from "react"
import { useState } from "react"

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
  children,
  isActive = false,
  onClick,
  title,
}: {
  ariaLabel: string
  children: ReactNode
  isActive?: boolean
  onClick: () => void
  title: string
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

export default function TopRightControls({
  floatingTimerData,
  isSharePanelOpen,
  isReadonlyClient,
  onOpenSharePanel,
}: {
  floatingTimerData: {
    isOpen: boolean
    isSupported: boolean
    toggle: () => Promise<void>
  }
  isSharePanelOpen: boolean
  isReadonlyClient: boolean
  onOpenSharePanel: () => void
}) {
  const [isViewerShareQrCodeOpen, setIsViewerShareQrCodeOpen] = useState(false)
  const { isFullscreen, isFullscreenSupported, toggleFullscreen } =
    useFullscreenState()
  const viewerShareUrl =
    typeof window === "undefined" ? "" : window.location.href

  return (
    <>
      <div className="absolute top-0 right-0 z-20 flex items-center p-2">
        <TopRightActionButton
          ariaLabel={isReadonlyClient ? "Share viewer link" : "Open sharing"}
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
          title="Share"
        >
          <ShareIcon className="size-4" />
        </TopRightActionButton>
        {!isReadonlyClient && floatingTimerData.isSupported ? (
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
        ) : null}
        {!isReadonlyClient && isFullscreenSupported ? (
          <TopRightActionButton
            ariaLabel={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={toggleFullscreen}
            title={isFullscreen ? "Close fullscreen" : "Fullscreen mode"}
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
          label="Viewer link"
          onClose={() => setIsViewerShareQrCodeOpen(false)}
          value={viewerShareUrl}
        />
      ) : null}
    </>
  )
}
