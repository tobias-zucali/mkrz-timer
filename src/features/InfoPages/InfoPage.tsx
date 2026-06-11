import Link from "next/link"

import { getMessagesForLocale } from "@/i18n/messages"
import type { AppLocale } from "@/i18n/config"

import MarkdownContent from "./MarkdownContent"
import {
  getInfoPageContent,
  getInfoPagePath,
  infoPageSlugs,
  type InfoPageSlug,
} from "./content"

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
  const { AppShell, InfoPages } = getMessagesForLocale(locale)

  const footerLinks = infoPageSlugs.map((pageSlug) => ({
    href: getInfoPagePath(locale, pageSlug),
    label: InfoPages.footer[pageSlug],
    slug: pageSlug,
  }))

  return (
    <main className="min-h-full bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-3">
          <Link
            className="inline-flex text-sm font-medium text-foreground/72 underline decoration-primary/60 underline-offset-4"
            href={`/${locale}`}
          >
            {AppShell.metadata.title}
          </Link>
          {content.resolvedLocale !== content.requestedLocale ? (
            <p className="inline-flex rounded-full border border-primary/50 bg-primary/12 px-3 py-1 text-sm text-foreground/88">
              {InfoPages.contentFallback}
            </p>
          ) : null}
        </div>

        <article className="rounded-4xl border border-white/10 bg-white/4 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:p-10">
          <MarkdownContent locale={locale} markdown={content.body} />
        </article>

        <footer className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <nav aria-label={InfoPages.footer.navigationLabel}>
            <ul className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-foreground/84">
              {footerLinks.map((link) => (
                <li key={link.slug}>
                  <Link
                    aria-current={link.slug === slug ? "page" : undefined}
                    className="underline decoration-primary/60 underline-offset-4"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  className="underline decoration-primary/60 underline-offset-4"
                  href="https://github.com/tobias-zucali/mkrz-timer"
                  rel="noreferrer"
                  target="_blank"
                >
                  {InfoPages.footer.github}
                </a>
              </li>
            </ul>
          </nav>
        </footer>
      </div>
    </main>
  )
}
