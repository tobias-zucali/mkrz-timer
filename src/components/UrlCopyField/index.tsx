import { ComponentProps, useId, useRef, useState } from "react"

import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"

import CloseButton from "@/components/CloseButton"
import useDialogFocusTrap from "@/utils/useDialogFocusTrap"
import useClipboardCopy from "@/utils/useClipboardCopy"

import InputField from "../InputField"

const iconButtonClassName =
  "ml-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-foreground/10 bg-foreground/[0.06] text-foreground/80 transition hover:bg-foreground/[0.12] hover:text-foreground focus:outline-2 focus:-outline-offset-2 focus:outline-primary"

function ArrowTopRightOnSquareIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4.5 12.75 6 6 9-13.5"
      />
    </svg>
  )
}

function ClipboardDocumentIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
      />
    </svg>
  )
}

function QrCodeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z"
      />
    </svg>
  )
}

export default function UrlCopyField({
  label,
  showOpenButton = false,
  value,
  ...otherProps
}: Omit<ComponentProps<typeof InputField>, "id"> & {
  label: string
  showOpenButton?: boolean
  value: string
}) {
  const fieldId = useId()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [isQrCodeOpen, setIsQrCodeOpen] = useState(false)
  const { canCopy, copyText, isCopied, isClient } = useClipboardCopy()

  useDialogFocusTrap({
    active: isQrCodeOpen,
    defaultFocusRef: closeButtonRef,
    dialogRef,
  })

  return (
    <>
      <InputField
        className="text-sm text-foreground/75"
        id={fieldId}
        value={isClient ? value : ""}
        readOnly={true}
        label={label}
        {...otherProps}
      >
        {canCopy && (
          <button
            className={iconButtonClassName}
            onClick={() => void copyText(value)}
            type="button"
            title={isCopied ? "Copied" : "Copy URL"}
            aria-label={isCopied ? "Copied" : "Copy URL"}
          >
            {isCopied ? <CheckIcon /> : <ClipboardDocumentIcon />}
          </button>
        )}
        {showOpenButton && (
          <Link
            className={iconButtonClassName}
            href={isClient ? value : ""}
            target="_blank"
            title="Open URL"
            aria-label="Open URL"
          >
            <ArrowTopRightOnSquareIcon />
          </Link>
        )}
        {isClient && value && (
          <button
            className={iconButtonClassName}
            onClick={() => setIsQrCodeOpen(true)}
            title={`Show ${label}`}
            aria-label={`Show ${label}`}
            type="button"
          >
            <QrCodeIcon />
          </button>
        )}
      </InputField>
      {isQrCodeOpen && (
        <div
          aria-labelledby={`${fieldId}_qr_title`}
          aria-modal="true"
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-8 bg-black p-8 text-center text-white sm:p-10"
          onClick={() => setIsQrCodeOpen(false)}
          ref={dialogRef}
          role="dialog"
          tabIndex={-1}
        >
          <CloseButton
            className="absolute right-5 top-5 z-[1] border-white/20 bg-white/10 text-white/85 hover:bg-white/16 hover:text-white focus:outline-white sm:right-8"
            onClick={(event) => {
              event.stopPropagation()
              setIsQrCodeOpen(false)
            }}
            ref={closeButtonRef}
          />
          <h1
            className="text-3xl font-bold sm:text-5xl"
            id={`${fieldId}_qr_title`}
          >
            Timer · {label}
          </h1>
          <span className="rounded-md bg-white p-4">
            <QRCodeSVG
              aria-label={label}
              className="h-64 w-64 sm:h-80 sm:w-80"
              marginSize={2}
              title={label}
              value={value}
            />
          </span>
          <span className="max-w-3xl break-all text-base text-white/85 sm:text-lg">
            {value}
          </span>
        </div>
      )}
    </>
  )
}
