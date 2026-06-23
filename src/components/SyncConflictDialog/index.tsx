"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import ActionDialog, {
  type ActionDialogAction,
} from "@/components/ActionDialog"
import DeveloperReportDialog from "@/components/DeveloperReportDialog"

export default function SyncConflictDialog({
  actions,
  description,
  eyebrow,
  getDeveloperReportBody,
  title,
}: {
  actions: ActionDialogAction[]
  description: string
  eyebrow?: string
  getDeveloperReportBody?: (() => string) | null
  title: string
}) {
  const t = useTranslations("SyncConflictDialog")
  const [isReportOpen, setIsReportOpen] = useState(false)
  const resolvedEyebrow = eyebrow ?? t("liveSessionRecovery")

  return (
    <>
      <ActionDialog
        actions={actions}
        defaultFocusActionIndex={0}
        description={description}
        eyebrow={resolvedEyebrow}
        role="alertdialog"
        title={title}
      >
        {getDeveloperReportBody ? (
          <button
            type="button"
            className="
              mt-4 mb-6 cursor-pointer text-sm font-medium text-primary
              underline decoration-primary/60 underline-offset-4
              transition-colors hover:text-primary/82
              focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-primary
            "
            onClick={() => setIsReportOpen(true)}
          >
            {t("sendDebugInfo")}
          </button>
        ) : null}
      </ActionDialog>
      {getDeveloperReportBody ? (
        <DeveloperReportDialog
          getReportBody={getDeveloperReportBody}
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
        />
      ) : null}
    </>
  )
}
