import Link from "next/link"

import MarkdownContent from "@/features/InfoPages/MarkdownContent"
import { getHomeContent } from "@/features/InfoPages/content"
import type { AppLocale } from "@/i18n/config"
import { getMessagesForLocale } from "@/i18n/messages"

import PublicPageFrame from "./PublicPageFrame"

function splitHomeBody(body: string) {
  const [introSource, ...sectionParts] = body.split("\n## ")

  return {
    intro: introSource.trim(),
    sections: sectionParts.length > 0 ? `## ${sectionParts.join("\n## ")}` : "",
  }
}

export function buildHomePageMetadata(locale: AppLocale) {
  const content = getHomeContent(locale)

  return {
    description: content.description,
    title: content.title,
  }
}

export default function HomePage({ locale }: { locale: AppLocale }) {
  const content = getHomeContent(locale)
  const { PublicSite } = getMessagesForLocale(locale)
  const { intro, sections } = splitHomeBody(content.body)

  return (
    <PublicPageFrame currentSlug="home" locale={locale}>
      <section
        className="
          relative grid gap-6 py-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.9fr)]
          lg:gap-10 lg:py-12
        "
      >
        <div
          aria-hidden="true"
          className="
            absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(circle_at_top,rgba(214,97,105,0.16),transparent_56%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_70%)]
          "
        />
        <div className="px-6 py-2 text-foreground sm:px-8 sm:py-4">
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            {content.title}
          </h1>
          <div className="mt-6 max-w-3xl text-lg/8 text-foreground/86">
            <MarkdownContent locale={locale} markdown={intro} />
          </div>
          <p className="mt-8 text-sm font-medium text-primary/82">
            {PublicSite.home.trustLine}
          </p>
        </div>

        <aside
          className="
            flex flex-col gap-0 px-6 sm:px-8 lg:border-l lg:border-white/10
            lg:pl-10
          "
        >
          <div className="border-t border-white/10 py-6 first:border-t-0 lg:py-7">
            <p className="text-sm font-semibold tracking-[0.18em] text-primary/78 uppercase">
              {PublicSite.home.localTimerLabel}
            </p>
            <p className="mt-3 text-sm/7 text-foreground/72">
              {PublicSite.home.localTimerDescription}
            </p>
            <Link
              className="mt-6 inline-flex rounded-full border border-primary/35 bg-primary/90 px-5 py-3 text-sm font-semibold text-background transition hover:bg-primary focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
              href={`/${locale}/t`}
            >
              {PublicSite.home.startLocalTimer}
            </Link>
          </div>
          <div className="border-t border-white/10 py-6 lg:py-7">
            <p className="text-sm font-semibold tracking-[0.18em] text-primary/78 uppercase">
              {PublicSite.home.liveSessionLabel}
            </p>
            <p className="mt-3 text-sm/7 text-foreground/72">
              {PublicSite.home.liveSessionDescription}
            </p>
            <Link
              className="mt-6 inline-flex rounded-full border border-white/14 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-primary/45 hover:text-primary focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
              href={`/${locale}/t#share`}
            >
              {PublicSite.home.createLiveSession}
            </Link>
          </div>
        </aside>
      </section>

      <section className="mt-6 border-t border-white/10 px-6 pt-8 pb-6 sm:px-8 sm:pt-10 sm:pb-8">
        <div className="mx-auto max-w-4xl">
          <MarkdownContent locale={locale} markdown={sections} />
        </div>
      </section>
    </PublicPageFrame>
  )
}
