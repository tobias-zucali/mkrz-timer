"use client"

import { useRef } from "react"
import { createPortal } from "react-dom"

import { QRCodeSVG } from "qrcode.react"

import CloseButton from "@/components/CloseButton"
import useDialogFocusTrap from "@/utils/useDialogFocusTrap"

export default function QrCodeOverlay({
  label,
  onClose,
  value,
}: {
  label: string
  onClose: () => void
  value: string
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useDialogFocusTrap({
    active: true,
    defaultFocusRef: closeButtonRef,
    dialogRef,
  })

  if (typeof document === "undefined") {
    return null
  }

  return createPortal(
    <div
      aria-labelledby="qr-code-overlay-title"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex cursor-pointer flex-col items-center justify-center gap-6 bg-black px-5 py-6 text-center text-white sm:gap-8 sm:px-8 sm:py-8"
      onClick={onClose}
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <CloseButton
        className="absolute right-4 top-4 z-[1] h-6 w-6 rounded-full border-foreground/14 bg-white/3 text-foreground/60 hover:bg-white/7 hover:text-foreground focus:outline-white sm:right-6 sm:top-6"
        onClick={(event) => {
          event.stopPropagation()
          onClose()
        }}
        ref={closeButtonRef}
      />
      <h1
        className="max-w-4xl text-2xl font-bold sm:text-4xl lg:text-5xl"
        id="qr-code-overlay-title"
      >
        Timer · {label}
      </h1>
      <span className="rounded-2xl bg-white p-4 shadow-2xl shadow-black/30 sm:p-5">
        <QRCodeSVG
          aria-label={label}
          className="h-[min(70vw,24rem)] w-[min(70vw,24rem)] sm:h-[min(50vw,28rem)] sm:w-[min(50vw,28rem)]"
          marginSize={2}
          title={label}
          value={value}
        />
      </span>
      <span className="max-w-4xl break-all text-sm text-white/82 sm:text-base lg:text-lg">
        {value}
      </span>
    </div>,
    document.body,
  )
}
