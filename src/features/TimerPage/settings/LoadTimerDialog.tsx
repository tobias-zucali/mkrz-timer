"use client"

import { useTranslations } from "next-intl"

import ActionDialog from "@/components/ActionDialog"
import RecentTimersList from "@/components/Sidebar/TimerPanel/RecentTimersList"
import type { ExampleTimer } from "@/components/ExampleCard/examplesData"
import { EXAMPLES } from "@/components/ExampleCard/examplesData"
import type { StoredTimerEntry } from "@/utils/timerLibrary"

const listButtonClassName =
  "w-full rounded-2xl border border-ink/10 bg-screen px-4 py-3 text-left transition hover:border-primary/35 hover:bg-ink/3 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"

function TemplateItem({
  example,
  onLoad,
}: {
  example: ExampleTimer
  onLoad: (example: ExampleTimer) => void
}) {
  return (
    <div className="flex items-start gap-2">
      <button
        className={listButtonClassName}
        onClick={() => onLoad(example)}
        type="button"
      >
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">
            {example.title}
          </p>
          <span className="shrink-0 rounded-full bg-ink/8 px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-widest text-ink/62 uppercase">
            {example.category}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5" aria-hidden="true">
          {example.steps.map((step, i) => (
            <span
              key={i}
              className="size-2.5 rounded-full"
              style={{ backgroundColor: step.color }}
              title={step.title}
            />
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ink/52">{example.groupSize}</p>
      </button>
    </div>
  )
}

export default function LoadTimerDialog({
  currentEntryId,
  entries,
  onClose,
  onDelete,
  onLoadTemplate,
  onSelect,
}: {
  currentEntryId: string | null
  entries: StoredTimerEntry[]
  onClose: () => void
  onDelete: (entryId: string) => void
  onLoadTemplate: (example: ExampleTimer) => void
  onSelect: (entryId: string) => void
}) {
  const t = useTranslations("Sidebar.timer")

  return (
    <ActionDialog
      actions={[
        {
          label: t("closeLoadTimerDialog"),
          onClick: onClose,
          tone: "primary",
        },
      ]}
      description={t("recentDialogDescription")}
      title={t("loadTimer")}
    >
      <div className="mt-5 space-y-6">
        <div>
          <p className="mb-3 font-mono text-xs font-bold tracking-[0.14em] text-ink/52 uppercase">
            {t("templatesHeading")}
          </p>
          <div className="max-h-[min(40vh,20rem)] space-y-2 overflow-y-auto pr-1">
            {EXAMPLES.map((example) => (
              <TemplateItem
                example={example}
                key={example.id}
                onLoad={onLoadTemplate}
              />
            ))}
          </div>
        </div>

        {entries.length > 0 ? (
          <div>
            <p className="mb-3 font-mono text-xs font-bold tracking-[0.14em] text-ink/52 uppercase">
              {t("recentHeading")}
            </p>
            <div className="max-h-[min(40vh,20rem)] overflow-y-auto pr-1">
              <RecentTimersList
                currentEntryId={currentEntryId}
                entries={entries}
                onDelete={onDelete}
                onSelect={onSelect}
              />
            </div>
          </div>
        ) : null}
      </div>
    </ActionDialog>
  )
}
