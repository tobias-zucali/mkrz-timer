"use client"

import { useLocale, useTranslations } from "next-intl"

import MarkdownContent from "@/features/InfoPages/MarkdownContent"
import type { InfoPageContent } from "@/features/InfoPages/content"
import type { AppLocale } from "@/i18n/config"

export default function InfoPanel({ content }: { content: InfoPageContent }) {
  const locale = useLocale() as AppLocale
  const tInfoPages = useTranslations("InfoPages")

  return (
    <article className="space-y-4 pb-2">
      {content.resolvedLocale !== content.requestedLocale ? (
        <p className="inline-flex rounded-full border border-primary/50 bg-primary/12 px-3 py-1 text-sm text-foreground/88">
          {tInfoPages("contentFallback")}
        </p>
      ) : null}
      <MarkdownContent compact locale={locale} markdown={content.body} />
    </article>
  )
}
