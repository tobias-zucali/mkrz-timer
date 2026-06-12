import { getMessagesForLocale } from "@/i18n/messages"
import type { AppLocale } from "@/i18n/config"

import PublicPageFrame from "@/features/PublicSite/PublicPageFrame"
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
            <p className="inline-flex rounded-full border border-primary/50 bg-primary/12 px-3 py-1 text-sm text-foreground/88">
              {InfoPages.contentFallback}
            </p>
          ) : null}
          <MarkdownContent locale={locale} markdown={content.body} />
        </div>
      </article>
    </PublicPageFrame>
  )
}
