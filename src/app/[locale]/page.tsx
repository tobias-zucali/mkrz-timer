import type { Metadata } from "next"

import HomePage, {
  buildHomePageMetadata,
} from "@/features/PublicSite/HomePage"
import { resolveAppLocale } from "@/i18n/locale"

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
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return <HomePage locale={resolveAppLocale(locale)} />
}
