import type { Metadata } from "next"
import { redirect } from "next/navigation"

import HomePage, { buildHomePageMetadata } from "@/features/PublicSite/HomePage"
import { resolveAppLocale } from "@/i18n/locale"

const legacyTimerParamKeys = ["a", "s", "t", "theme", "ts", "v"] as const

function buildTimerCompatibilityUrl(
  locale: string,
  searchParams: Record<string, string | string[] | undefined>,
) {
  const currentSearchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        currentSearchParams.append(key, entry)
      }
      continue
    }

    if (typeof value === "string") {
      currentSearchParams.set(key, value)
    }
  }

  if (!legacyTimerParamKeys.some((key) => currentSearchParams.has(key))) {
    return null
  }

  const search = currentSearchParams.toString()

  return search ? `/${locale}/t?${search}` : `/${locale}/t`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  return buildHomePageMetadata(resolveAppLocale(locale))
}

export default async function LocalizedHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const resolvedLocale = resolveAppLocale(locale)
  const timerCompatibilityUrl = buildTimerCompatibilityUrl(
    resolvedLocale,
    await searchParams,
  )

  if (timerCompatibilityUrl) {
    redirect(timerCompatibilityUrl)
  }

  return <HomePage locale={resolvedLocale} />
}
