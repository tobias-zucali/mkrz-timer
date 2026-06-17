"use client"

import { startTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { AppLocale } from "@/i18n/config"
import { localizePathname } from "@/i18n/locale"
import { pauseUrlSyncDuringRemoteRouteTransition } from "@/utils/timerPage/routeTransition"

const LOCALE_LABEL: Record<AppLocale, string> = {
  de: "DE",
  en: "EN",
}

export default function PublicLocaleSwitcher({
  currentLocale,
  label,
}: {
  currentLocale: AppLocale
  englishLabel: string
  germanLabel: string
  label: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  function switchTo(nextLocale: AppLocale) {
    const nextPathname = localizePathname(pathname, nextLocale)
    const nextSearch = searchParams.toString()
    const nextUrl = nextSearch ? `${nextPathname}?${nextSearch}` : nextPathname

    startTransition(() => {
      pauseUrlSyncDuringRemoteRouteTransition()
      router.replace(nextUrl)
    })
  }

  const otherLocale: AppLocale = currentLocale === "en" ? "de" : "en"

  return (
    <button
      aria-label={label}
      className="cursor-pointer font-body text-sm font-medium text-clay-400 transition hover:text-clay-900"
      onClick={() => switchTo(otherLocale)}
      type="button"
    >
      {LOCALE_LABEL[otherLocale]}
    </button>
  )
}
