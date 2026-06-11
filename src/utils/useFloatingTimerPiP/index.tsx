import { useCallback, useEffect, useRef, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { useTranslations } from "next-intl"

import FloatingTimerContent from "@/components/FloatingTimerContent"
import type { AppTranslationFn } from "@/i18n/translator"
import { buildTimerReadoutLabel } from "@/utils/accessibility/timer"
import debug from "@/utils/debug"

type DocumentPictureInPictureWindow = Window & {
  document: Document
}

type DocumentPictureInPictureApi = EventTarget & {
  requestWindow: (options?: {
    width?: number
    height?: number
    disallowReturnToOpener?: boolean
    preferInitialWindowPlacement?: boolean
  }) => Promise<DocumentPictureInPictureWindow>
  window: DocumentPictureInPictureWindow | null
}

type FloatingTimerState = {
  backgroundColor: string
  elapsedPercentage: number
  foregroundColor: string
  isTimedOut: boolean
  minutes: string
  primaryColor: string
  seconds: string
  title: string
}

export type FloatingTimerData = {
  isOpen: boolean
  isSupported: boolean
  unsupportedReason: string | null
  toggle: () => Promise<void>
}

function extractChromiumVersion(userAgent: string) {
  const chromiumMatch = userAgent.match(/(?:Chrome|Chromium|Edg)\/(\d+)/)
  return chromiumMatch ? Number(chromiumMatch[1]) : null
}

function getDocumentPictureInPictureSupportReason(t: AppTranslationFn) {
  if (typeof window === "undefined") {
    return null
  }

  if (!window.isSecureContext) {
    return t("TimerPage.floatingTimer.requiresSecureContext")
  }

  const userAgent = navigator.userAgent
  const chromiumVersion = extractChromiumVersion(userAgent)

  if (!chromiumVersion) {
    return t("TimerPage.floatingTimer.requiresChromium")
  }

  if (chromiumVersion < 116) {
    return t("TimerPage.floatingTimer.requiresVersion", {
      version: chromiumVersion,
    })
  }

  if (
    !("documentPictureInPicture" in window) ||
    !window.documentPictureInPicture
  ) {
    return t("TimerPage.floatingTimer.missingDocumentPiP")
  }

  return null
}

function getDocumentPictureInPicture() {
  if (
    typeof window === "undefined" ||
    !("documentPictureInPicture" in window) ||
    !window.documentPictureInPicture
  ) {
    return null
  }

  return window.documentPictureInPicture as DocumentPictureInPictureApi
}

function copyDocumentStyles(targetDocument: Document) {
  targetDocument.head.innerHTML = ""
  for (const node of document.head.querySelectorAll(
    'style, link[rel="stylesheet"]',
  )) {
    targetDocument.head.appendChild(node.cloneNode(true))
  }
}

function applyPiPDocumentStyles(targetDocument: Document) {
  targetDocument.documentElement.className = document.documentElement.className
  targetDocument.body.className = document.body.className
  targetDocument.body.style.cssText = [
    document.body.style.cssText,
    "margin:0",
    "overflow:hidden",
    "height:100vh",
  ].join(";")
}

export default function useFloatingTimerPiP({
  setErrorText,
  state,
}: {
  setErrorText: React.Dispatch<React.SetStateAction<string | null>>
  state: FloatingTimerState
}): FloatingTimerData {
  const t = useTranslations()
  const tTimer = useTranslations("Timer")
  const pipRootRef = useRef<Root | null>(null)
  const pipRootMountedRef = useRef(false)
  const pipWindowRef = useRef<DocumentPictureInPictureWindow | null>(null)
  const pipCloseHandlerRef = useRef<(() => void) | null>(null)

  const [unsupportedReason, setUnsupportedReason] = useState<string | null>(
    null,
  )
  const [isOpen, setIsOpen] = useState(false)

  const renderPiPWindow = useCallback(() => {
    const pipRoot = pipRootRef.current
    const pipWindow = pipWindowRef.current

    if (
      !pipRoot ||
      !pipRootMountedRef.current ||
      !pipWindow ||
      pipWindow.closed
    ) {
      return
    }

    pipRoot.render(
      <FloatingTimerContent
        accessibleTimerText={buildTimerReadoutLabel({
          activeIndex: 0,
          readoutState: state.isTimedOut ? "finished" : "viewOnly",
          remainingSeconds:
            Number.parseInt(state.minutes, 10) * 60 +
            Number.parseInt(state.seconds, 10),
          rowCount: 1,
          t: tTimer,
        })}
        backgroundColor={state.backgroundColor}
        elapsedPercentage={state.elapsedPercentage}
        foregroundColor={state.foregroundColor}
        isTimedOut={state.isTimedOut}
        minutes={state.minutes}
        primaryColor={state.primaryColor}
        seconds={state.seconds}
        title={state.title}
      />,
    )
  }, [state, tTimer])

  const closePiPWindow = useCallback((shouldCloseWindow = true) => {
    const pipWindow = pipWindowRef.current
    if (pipCloseHandlerRef.current && pipWindow) {
      pipWindow.removeEventListener("pagehide", pipCloseHandlerRef.current)
    }

    pipCloseHandlerRef.current = null
    pipRootMountedRef.current = false
    pipRootRef.current?.unmount()
    pipRootRef.current = null
    pipWindowRef.current = null

    if (shouldCloseWindow && pipWindow && !pipWindow.closed) {
      pipWindow.close()
    }

    setIsOpen(false)
  }, [])

  const toggle = useCallback(async () => {
    if (pipWindowRef.current) {
      closePiPWindow()
      return
    }

    const documentPictureInPicture = getDocumentPictureInPicture()
    if (!documentPictureInPicture) {
      return
    }

    try {
      const pipWindow = await documentPictureInPicture.requestWindow({
        width: 520,
        height: 520,
        disallowReturnToOpener: false,
        preferInitialWindowPlacement: true,
      })
      const pipDocument = pipWindow.document

      copyDocumentStyles(pipDocument)
      applyPiPDocumentStyles(pipDocument)
      pipDocument.title = t("TimerPage.floatingTimer.windowTitle")
      pipDocument.body.innerHTML = ""

      const container = pipDocument.createElement("div")
      pipDocument.body.appendChild(container)

      pipRootRef.current = createRoot(container)
      pipRootMountedRef.current = true
      pipWindowRef.current = pipWindow

      const handlePageHide = () => {
        closePiPWindow(false)
      }
      pipCloseHandlerRef.current = handlePageHide
      pipWindow.addEventListener("pagehide", handlePageHide, { once: true })

      setIsOpen(true)
      renderPiPWindow()
    } catch (error) {
      debug.error(error)
      setErrorText(
        t("TimerPage.floatingTimer.openError", { error: String(error) }),
      )
    }
  }, [closePiPWindow, renderPiPWindow, setErrorText, t])

  useEffect(() => {
    setUnsupportedReason(
      getDocumentPictureInPictureSupportReason(t as AppTranslationFn),
    )
  }, [t])

  useEffect(() => {
    if (!pipWindowRef.current) {
      return
    }

    applyPiPDocumentStyles(pipWindowRef.current.document)
    renderPiPWindow()
  }, [renderPiPWindow])

  useEffect(() => {
    return () => {
      closePiPWindow()
    }
  }, [closePiPWindow])

  return {
    isOpen,
    isSupported: !unsupportedReason,
    unsupportedReason,
    toggle,
  }
}
