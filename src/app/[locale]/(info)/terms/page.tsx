import type { Metadata } from "next"

import InfoPage, { buildInfoPageMetadata } from "@/features/InfoPages/InfoPage"
import { resolveAppLocale } from "@/i18n/locale"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return buildInfoPageMetadata({
    locale: resolveAppLocale(locale),
    slug: "terms",
  })
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return <InfoPage locale={resolveAppLocale(locale)} slug="terms" />
}
