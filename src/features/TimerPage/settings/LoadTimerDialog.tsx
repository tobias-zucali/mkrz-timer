"use client"

import React, { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"

import ActionDialog from "@/components/ActionDialog"
import type { ExampleTimer } from "@/components/ExampleCard/examplesData"
import { EXAMPLES } from "@/components/ExampleCard/examplesData"
import type { StoredTimerEntry } from "@/utils/timerLibrary"
import { TrashIcon } from "@/utils/icons"

function TimerCard({
  badge,
  deleteLabel,
  dots,
  isActive,
  meta,
  onDelete,
  onLoad,
  subtitle,
  title,
}: {
  badge?: { label: string; variant: "category" | "current" }
  deleteLabel?: string
  dots?: { color: string; title: string }[]
  isActive?: boolean
  meta?: string
  onDelete?: () => void
  onLoad: () => void
  subtitle?: string
  title: string
}) {
  return (
    <div className="relative rounded-2xl border border-ink/10 bg-screen transition hover:border-primary/35 hover:bg-ink/3">
      <button
        aria-pressed={isActive}
        className="w-full rounded-2xl px-4 py-3 text-left focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
        onClick={onLoad}
        type="button"
      >
        <div className={`flex items-center gap-2 ${onDelete ? "pr-7" : ""}`}>
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          {badge?.variant === "current" ? (
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[0.68rem] font-semibold text-ink">
              {badge.label}
            </span>
          ) : badge?.variant === "category" ? (
            <span className="shrink-0 rounded-full bg-ink/8 px-2 py-0.5 font-mono text-[0.62rem] font-bold tracking-widest text-ink/62 uppercase">
              {badge.label}
            </span>
          ) : null}
        </div>
        {dots && dots.length > 0 ? (
          <div aria-hidden="true" className="mt-2 flex flex-wrap gap-1.5">
            {dots.map((dot, i) => (
              <span
                key={i}
                className="size-2.5 rounded-full"
                style={{ backgroundColor: dot.color }}
                title={dot.title}
              />
            ))}
          </div>
        ) : null}
        {subtitle ? (
          <p className="mt-1.5 text-xs text-ink/52">{subtitle}</p>
        ) : null}
        {meta ? <p className="mt-1 text-xs text-ink/52">{meta}</p> : null}
      </button>
      {onDelete ? (
        <button
          aria-label={deleteLabel}
          className="absolute top-3 right-3 rounded-full p-1.5 text-ink/38 transition hover:bg-ink/8 hover:text-ink/70 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
          onClick={onDelete}
          type="button"
        >
          <TrashIcon className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}

function getFirstStepTitle(entry: StoredTimerEntry) {
  return (
    entry.params.rows
      .find((row) => row.title.trim().length > 0)
      ?.title.trim() ?? ""
  )
}

function buildEntryLabel(
  entry: StoredTimerEntry,
  t: ReturnType<typeof useTranslations>,
) {
  const pageTitle = entry.pageTitle.trim()
  if (pageTitle) return pageTitle
  const firstStepTitle = getFirstStepTitle(entry)
  if (firstStepTitle) return firstStepTitle
  return t("untitledTimer")
}

function TabPanel({
  description,
  children,
}: {
  description: string
  children: React.ReactNode
}) {
  return (
    <>
      <p className="my-4 text-sm/6 text-ink/52">{description}</p>
      <div className="mb-4 space-y-2">{children}</div>
    </>
  )
}

type Tab = "recent" | "templates"

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
  const locale = useLocale()
  const [activeTab, setActiveTab] = useState<Tab>(
    entries.length > 0 ? "recent" : "templates",
  )
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  )

  const tabs: { id: Tab; label: string; hidden?: boolean }[] = [
    { id: "recent", label: t("recentTab"), hidden: entries.length === 0 },
    { id: "templates", label: t("templatesTab") },
  ]

  return (
    <ActionDialog
      actions={[
        {
          label: t("closeLoadTimerDialog"),
          onClick: onClose,
          tone: "primary",
        },
      ]}
      description=""
      title={t("loadTimer")}
    >
      <div className="mt-3 sm:mt-5">
        {entries.length > 0 ? (
          <div className="flex gap-1 border-b border-ink/10" role="tablist">
            {tabs.map(({ id, label, hidden }) =>
              hidden ? null : (
                <button
                  aria-selected={activeTab === id}
                  className={[
                    "px-3 pb-2.5 pt-1 text-sm font-semibold transition focus:outline-2 focus:-outline-offset-2 focus:outline-primary",
                    activeTab === id
                      ? "border-b-2 border-primary text-primary"
                      : "text-ink/52 hover:text-ink/80",
                  ].join(" ")}
                  key={id}
                  onClick={() => setActiveTab(id)}
                  role="tab"
                  type="button"
                >
                  {label}
                </button>
              ),
            )}
          </div>
        ) : null}

        <div
          className="max-h-[min(50vh,24rem)] overflow-y-auto pr-1"
          role="tabpanel"
        >
          {activeTab === "recent" ? (
            <TabPanel description={t("recentTabDescription")}>
              {entries.map((entry) => {
                const isCurrent = entry.id === currentEntryId
                const label = buildEntryLabel(entry, t)
                return (
                  <TimerCard
                    badge={
                      isCurrent
                        ? { label: t("currentTimer"), variant: "current" }
                        : undefined
                    }
                    deleteLabel={t("deleteRecentTimer", { title: label })}
                    dots={entry.params.rows.map((row) => ({
                      color: row.primaryColor,
                      title: row.title,
                    }))}
                    isActive={isCurrent}
                    key={entry.id}
                    meta={t("updatedAt", {
                      timestamp: formatter.format(entry.updatedAt),
                    })}
                    onDelete={() => onDelete(entry.id)}
                    onLoad={() => onSelect(entry.id)}
                    title={label}
                  />
                )
              })}
            </TabPanel>
          ) : (
            <TabPanel description={t("templatesTabDescription")}>
              {EXAMPLES.map((example) => (
                <TimerCard
                  badge={{ label: example.category, variant: "category" }}
                  dots={example.steps.map((step) => ({
                    color: step.color,
                    title: step.title,
                  }))}
                  key={example.id}
                  onLoad={() => onLoadTemplate(example)}
                  subtitle={example.groupSize}
                  title={example.title}
                />
              ))}
            </TabPanel>
          )}
        </div>
      </div>
    </ActionDialog>
  )
}
