import { getMessagesForLocale } from "@/i18n/messages"
import type { AppLocale } from "@/i18n/config"

import PublicPageFrame from "@/features/PublicSite/PublicPageFrame"
import LocaleFallbackNotice from "./LocaleFallbackNotice"
import MarkdownContent from "./MarkdownContent"
import { getInfoPageContent, type InfoPageSlug } from "./content"

export function buildInfoPageMetadata({
  locale,
  slug,
}: {
  locale: AppLocale
  slug: InfoPageSlug
}) {
  const content = getInfoPageContent(locale, slug)

  return {
    description: content.description,
    title: content.title,
  }
}

export default function InfoPage({
  locale,
  slug,
}: {
  locale: AppLocale
  slug: InfoPageSlug
}) {
  const content = getInfoPageContent(locale, slug)
  const { InfoPages } = getMessagesForLocale(locale)

  return (
    <PublicPageFrame currentSlug={slug} locale={locale}>
      <article className="p-6 sm:p-8 lg:p-10">
        <div className="mx-auto max-w-4xl space-y-6">
          {content.resolvedLocale !== content.requestedLocale ? (
            <LocaleFallbackNotice>
              {InfoPages.contentFallback}
            </LocaleFallbackNotice>
          ) : null}
          <MarkdownContent locale={locale} markdown={content.body} />
        </div>
      </article>
    </PublicPageFrame>
  )
}
