import type { ReactNode } from "react"
import { setRequestLocale } from "next-intl/server"

import { appLocales } from "@/i18n/config"
import { resolveAppLocale } from "@/i18n/locale"

export function generateStaticParams() {
  return appLocales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  setRequestLocale(resolveAppLocale(locale))

  return children
}
