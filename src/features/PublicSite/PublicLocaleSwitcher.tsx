"use client"

import { startTransition, useId } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { AppLocale } from "@/i18n/config"
import { localizePathname } from "@/i18n/locale"
import { pauseUrlSyncDuringRemoteRouteTransition } from "@/utils/timerPage/routeTransition"

export default function PublicLocaleSwitcher({
  currentLocale,
  englishLabel,
  germanLabel,
  label,
}: {
  currentLocale: AppLocale
  englishLabel: string
  germanLabel: string
  label: string
}) {
  const fieldId = useId()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <label
      className="flex items-center gap-2 text-sm text-foreground/78"
      htmlFor={fieldId}
    >
      <span>{label}</span>
      <select
        className="
          rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-sm
          text-foreground outline-none transition focus:border-primary
          focus:ring-2 focus:ring-primary/20
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
        <option value="en">{englishLabel}</option>
        <option value="de">{germanLabel}</option>
      </select>
    </label>
  )
}
