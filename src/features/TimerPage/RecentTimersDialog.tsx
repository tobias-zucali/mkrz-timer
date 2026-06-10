"use client"

import { useTranslations } from "next-intl"

import ActionDialog from "@/components/ActionDialog"
import RecentTimersList from "@/components/Sidebar/TimerPanel/RecentTimersList"
import type { StoredTimerEntry } from "@/utils/timerLibrary"

export default function RecentTimersDialog({
  currentEntryId,
  entries,
  onClose,
  onDelete,
  onSelect,
}: {
  currentEntryId: string | null
  entries: StoredTimerEntry[]
  onClose: () => void
  onDelete: (entryId: string) => void
  onSelect: (entryId: string) => void
}) {
  const t = useTranslations("Sidebar.timer")

  return (
    <ActionDialog
      actions={[
        {
          label: t("closeRecentDialog"),
          onClick: onClose,
          tone: "primary",
        },
      ]}
      description={t("recentDialogDescription")}
      title={t("recentTimers")}
    >
      <div className="mt-5">
        <div className="max-h-[min(60vh,32rem)] overflow-y-auto pr-1">
          <RecentTimersList
            currentEntryId={currentEntryId}
            entries={entries}
            onDelete={onDelete}
            onSelect={onSelect}
          />
        </div>
      </div>
    </ActionDialog>
  )
}
