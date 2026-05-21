"use client"

import { useState } from "react"

import ActionDialog, {
  type ActionDialogAction,
} from "@/components/ActionDialog"
import DeveloperReportDialog from "@/components/DeveloperReportDialog"

export default function SyncConflictDialog({
  actions,
  description,
  eyebrow = "Live session recovery",
  getDeveloperReportBody,
  title,
}: {
  actions: ActionDialogAction[]
  description: string
  eyebrow?: string
  getDeveloperReportBody?: (() => string) | null
  title: string
}) {
  const [isReportOpen, setIsReportOpen] = useState(false)

  return (
    <>
      <ActionDialog
        actions={actions}
        defaultFocusActionIndex={0}
        description={description}
        eyebrow={eyebrow}
        title={title}
      >
        {getDeveloperReportBody ? (
          <button
            type="button"
            className="
              mt-4 cursor-pointer text-sm font-medium text-primary
              underline decoration-primary/60 underline-offset-4
              transition-colors hover:text-primary/82
              focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-primary
            "
            onClick={() => setIsReportOpen(true)}
          >
            Send Debug Info
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
