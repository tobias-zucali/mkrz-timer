"use client"

import { startTransition, useId } from "react"
import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { AppLocale } from "@/i18n/config"
import { localizePathname } from "@/i18n/locale"
import { pauseUrlSyncDuringRemoteRouteTransition } from "@/utils/timerPage/routeTransition"

export default function LocaleSwitcher() {
  const currentLocale = useLocale() as AppLocale
  const t = useTranslations("Sidebar.settings")
  const fieldId = useId()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <section className="space-y-4">
      <label className="grid gap-2" htmlFor={fieldId}>
        <h3 className="text-base font-semibold text-ink">
          {t("languageHeading")}
        </h3>
        <select
          className="
            rounded-2xl border border-ink/10 bg-ink/2 px-4 py-3
            text-sm text-ink transition outline-none
            focus:border-primary focus:ring-2 focus:ring-primary/20
          "
          id={fieldId}
          onChange={(event) => {
            const nextLocale = event.target.value as AppLocale
            const nextPathname = localizePathname(pathname, nextLocale)
            const nextSearch = searchParams.toString()
            const nextUrl = nextSearch
              ? `${nextPathname}?${nextSearch}`
              : nextPathname

            startTransition(() => {
              pauseUrlSyncDuringRemoteRouteTransition()
              router.replace(nextUrl)
            })
          }}
          value={currentLocale}
        >
          <option value="en">{t("languageEnglish")}</option>
          <option value="de">{t("languageGerman")}</option>
        </select>
      </label>
    </section>
  )
}
