"use client"

import { useId, useMemo, type SyntheticEvent } from "react"
import { useTranslations } from "next-intl"

import ActionDialog from "@/components/ActionDialog"
import IconButton from "@/components/IconButton"
import {
  buildDurationPartsFromTotalSeconds,
  type TimerSequenceRow,
} from "@/shared/timerSequence"
import { ArrowDownTrayIcon, ClipboardDocumentIcon } from "@/utils/icons"
import useClipboardCopy from "@/utils/useClipboardCopy"

export default function ManualSaveDialog({
  controlClientUrl,
  onClose,
  pageTitle,
  readonlyClientUrl,
  rows,
  timerUrl,
}: {
  controlClientUrl: string
  onClose: () => void
  pageTitle: string
  readonlyClientUrl: string
  rows: TimerSequenceRow[]
  timerUrl: string
}) {
  const t = useTranslations("Sidebar.timer")
  const tShare = useTranslations("Sidebar.share")
  const exportTextareaId = useId()
  const { canCopy, copyText, isCopied } = useClipboardCopy()
  const resolvedTimerTitle = pageTitle.trim() || t("pageTitlePlaceholder")
  const resolvedStepLines = useMemo(
    () =>
      rows.map((row, index) => {
        const duration = buildDurationPartsFromTotalSeconds(row.totalSeconds)
        const formattedDuration = `${duration.m}:${duration.s}`
        const stepLabel = t("step", { step: index + 1 })
        const stepTitle = row.title.trim()

        return stepTitle
          ? `${stepLabel} (${formattedDuration}): ${stepTitle}`
          : `${stepLabel} (${formattedDuration})`
      }),
    [rows, t],
  )
  const handleSelectExportText = (
    event: SyntheticEvent<HTMLTextAreaElement>,
  ) => {
    event.currentTarget.select()
  }
  const exportText = useMemo(() => {
    const lines = [
      `${t("saveDialogTimerLabel")}: ${resolvedTimerTitle}`,
      ...resolvedStepLines,
      timerUrl,
    ]

    if (controlClientUrl) {
      lines.push("", tShare("controlLink"), controlClientUrl)
    }

    if (readonlyClientUrl) {
      lines.push("", tShare("viewerLink"), readonlyClientUrl)
    }

    return lines.join("\n")
  }, [
    controlClientUrl,
    readonlyClientUrl,
    resolvedStepLines,
    resolvedTimerTitle,
    t,
    tShare,
    timerUrl,
  ])

  const handleDownload = () => {
    if (typeof document === "undefined" || typeof URL === "undefined") {
      return
    }

    const safeFileName =
      resolvedTimerTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || t("saveDialogDownloadFilenameFallback")
    const file = new Blob([exportText], {
      type: "text/plain;charset=utf-8",
    })
    const downloadUrl = URL.createObjectURL(file)
    const link = document.createElement("a")
    link.href = downloadUrl
    link.download = `${safeFileName}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(downloadUrl)
  }

  return (
    <ActionDialog
      actions={[
        {
          label: t("closeSaveDialog"),
          onClick: onClose,
          tone: "primary",
        },
      ]}
      description={t("saveDialogDescription")}
      title={t("saveDialogTitle")}
    >
      <div className="mt-5 space-y-4">
        <p className="text-sm/6 text-foreground/78">{t("saveDialogText")}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label
              className="text-sm font-semibold text-foreground"
              htmlFor={exportTextareaId}
            >
              {t("saveDialogManualStorageTitle")}
            </label>
            <div className="flex items-center justify-end gap-2">
              {canCopy ? (
                <IconButton
                  aria-label={
                    isCopied ? t("saveDialogCopied") : t("saveDialogCopyAll")
                  }
                  onClick={() => void copyText(exportText)}
                  shape="round"
                  size="sm"
                  title={
                    isCopied ? t("saveDialogCopied") : t("saveDialogCopyAll")
                  }
                >
                  <ClipboardDocumentIcon className="size-4" />
                </IconButton>
              ) : null}
              <IconButton
                aria-label={t("saveDialogDownload")}
                onClick={handleDownload}
                shape="round"
                size="sm"
                title={t("saveDialogDownload")}
              >
                <ArrowDownTrayIcon className="size-4" />
              </IconButton>
            </div>
          </div>
          <textarea
            className="
              min-h-44 w-full rounded-2xl border border-foreground/14
              bg-foreground/4.5 px-4 py-3 font-mono text-[0.82rem]/6
              text-foreground transition outline-none
              focus:border-primary/50 focus:bg-foreground/6
              focus:outline-2 focus:-outline-offset-2 focus:outline-primary
            "
            id={exportTextareaId}
            onClick={handleSelectExportText}
            onFocus={handleSelectExportText}
            readOnly={true}
            spellCheck={false}
            value={exportText}
          />
        </div>
      </div>
    </ActionDialog>
  )
}
