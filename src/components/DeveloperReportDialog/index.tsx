"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslations } from "next-intl"

import CloseButton from "@/components/CloseButton"
import ActionButton from "@/utils/ActionButton"
import useClipboardCopy from "@/utils/useClipboardCopy"
import useDialogFocusTrap from "@/utils/useDialogFocusTrap"

export default function DeveloperReportDialog({
  getReportBody,
  isOpen,
  onClose,
  subject,
}: {
  getReportBody: () => string
  isOpen: boolean
  onClose: () => void
  subject?: string
}) {
  const t = useTranslations("DeveloperReportDialog")
  const [reportComment, setReportComment] = useState("")
  const reportDialogRef = useRef<HTMLDivElement>(null)
  const reportCommentRef = useRef<HTMLTextAreaElement>(null)
  const { canCopy, copyText, isCopied } = useClipboardCopy()

  useEffect(() => {
    if (!isOpen) {
      setReportComment("")
    }
  }, [isOpen])

  useDialogFocusTrap({
    active: isOpen,
    defaultFocusRef: reportCommentRef,
    dialogRef: reportDialogRef,
  })

  if (!isOpen || typeof document === "undefined") {
    return null
  }

  const resolvedSubject = subject ?? t("subject")
  const trimmedReportComment = reportComment.trim()
  const mailBody = [
    t("userComment"),
    trimmedReportComment || t("noAdditionalComment"),
    "",
    getReportBody(),
  ].join("\n")

  const openMailApp = () => {
    window.location.href = `mailto:timer@mkrz.at?subject=${encodeURIComponent(resolvedSubject)}&body=${encodeURIComponent(mailBody)}`
  }

  return createPortal(
    <div
      aria-modal="true"
      className="
        fixed inset-0 z-60 flex items-center justify-center bg-background/70
        px-4 py-6 backdrop-blur-sm
      "
      ref={reportDialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <div
        className="
          w-full max-w-xl rounded-3xl border border-foreground/12 bg-background
          p-6 shadow-2xl shadow-background/35
        "
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className="
                text-xs font-semibold tracking-[0.16em] text-primary/80
                uppercase
              "
            >
              {t("support")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              {t("heading")}
            </h2>
          </div>
          <CloseButton onClick={onClose} />
        </div>
        <label className="mt-5 block text-sm font-medium text-foreground">
          {t("whatHappened")}
          <textarea
            className="
              mt-2 min-h-28 w-full rounded-2xl border border-foreground/12
              bg-foreground/4 px-4 py-3 text-sm text-foreground transition
              outline-none focus:border-primary
            "
            onChange={(event) => setReportComment(event.target.value)}
            ref={reportCommentRef}
            value={reportComment}
          />
        </label>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          {canCopy ? (
            <ActionButton
              className="
                border border-foreground/12 bg-foreground/4 text-foreground
                hover:border-foreground/18 hover:bg-foreground/8
                hover:text-foreground
              "
              onClick={() => copyText(mailBody)}
            >
              {isCopied ? t("copied") : t("copyReport")}
            </ActionButton>
          ) : null}
          <ActionButton onClick={openMailApp}>{t("sendEmail")}</ActionButton>
        </div>
      </div>
    </div>,
    document.body,
  )
}
