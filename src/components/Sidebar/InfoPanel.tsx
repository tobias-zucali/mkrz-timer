"use client"

import { useLocale, useTranslations } from "next-intl"

import LocaleFallbackNotice from "@/features/InfoPages/LocaleFallbackNotice"
import MarkdownContent from "@/features/InfoPages/MarkdownContent"
import type { InfoPageContent } from "@/features/InfoPages/content"
import type { AppLocale } from "@/i18n/config"

export default function InfoPanel({ content }: { content: InfoPageContent }) {
  const locale = useLocale() as AppLocale
  const tInfoPages = useTranslations("InfoPages")

  return (
    <article className="space-y-4 pb-2">
      {content.resolvedLocale !== content.requestedLocale ? (
        <LocaleFallbackNotice>{tInfoPages("contentFallback")}</LocaleFallbackNotice>
      ) : null}
      <MarkdownContent compact locale={locale} markdown={content.body} />
    </article>
  )
}
