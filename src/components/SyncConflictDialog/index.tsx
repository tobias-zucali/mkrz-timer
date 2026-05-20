"use client"

import ActionDialog, {
  type ActionDialogAction,
} from "@/components/ActionDialog"

export default function SyncConflictDialog({
  actions,
  description,
  eyebrow = "Live session recovery",
  title,
}: {
  actions: ActionDialogAction[]
  description: string
  eyebrow?: string
  title: string
}) {
  return (
    <ActionDialog
      actions={actions}
      defaultFocusActionIndex={0}
      description={description}
      eyebrow={eyebrow}
      title={title}
    />
  )
}
