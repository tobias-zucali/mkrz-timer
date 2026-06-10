"use client"

import { useMemo } from "react"

import { useLocale, useTranslations } from "next-intl"

import IconButton from "@/components/IconButton"
import type { StoredTimerEntry } from "@/utils/timerLibrary"
import { TrashIcon } from "@/utils/icons"

const listButtonClassName =
  "w-full rounded-2xl border border-foreground/10 bg-background px-4 py-3 text-left transition hover:border-primary/35 hover:bg-foreground/3 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"

function buildEntrySummary(
  entry: StoredTimerEntry,
  t: ReturnType<typeof useTranslations>,
) {
  const rowCount = entry.params.rows.length
  const durationSummary =
    rowCount === 1
      ? t("recentTimerSingleStep")
      : t("recentTimerStepCount", { count: rowCount })

  const title = entry.params.title.trim()
  if (!title) {
    return durationSummary
  }

  return `${title} • ${durationSummary}`
}

export default function RecentTimersList({
  currentEntryId,
  entries,
  onDelete,
  onSelect,
}: {
  currentEntryId: string | null
  entries: StoredTimerEntry[]
  onDelete: (entryId: string) => void
  onSelect: (entryId: string) => void
}) {
  const locale = useLocale()
  const t = useTranslations("Sidebar.timer")
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  )

  if (entries.length === 0) {
    return null
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">
          {t("recentTimers")}
        </h3>
      </div>
      <div className="space-y-3">
        {entries.map((entry) => {
          const isCurrent = entry.id === currentEntryId
          const label = entry.pageTitle.trim() || t("pageTitlePlaceholder")

          return (
            <div className="flex items-start gap-2" key={entry.id}>
              <button
                aria-pressed={isCurrent}
                className={listButtonClassName}
                onClick={() => onSelect(entry.id)}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {label}
                  </p>
                  {isCurrent ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[0.68rem] font-semibold text-background">
                      {t("currentTimer")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-xs text-foreground/62">
                  {buildEntrySummary(entry, t)}
                </p>
                <p className="mt-2 text-xs text-foreground/52">
                  {t("updatedAt", {
                    timestamp: formatter.format(entry.updatedAt),
                  })}
                </p>
              </button>
              <IconButton
                aria-label={t("deleteRecentTimer", { title: label })}
                onClick={() => onDelete(entry.id)}
                shape="round"
                size="sm"
                title={t("delete")}
              >
                <TrashIcon className="size-4" />
              </IconButton>
            </div>
          )
        })}
      </div>
    </section>
  )
}
