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

function WavyUnderline() {
  return (
    <svg
      aria-hidden="true"
      className="absolute -bottom-3.5 left-0 w-full"
      fill="none"
      height="18"
      preserveAspectRatio="none"
      viewBox="0 0 260 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 10 Q 33 2 64 10 T 128 10 T 192 10 T 256 10"
        stroke="#d61f69"
        strokeLinecap="round"
        strokeWidth="5"
      />
    </svg>
  )
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
      <section className="px-6 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-5xl font-semibold tracking-tight text-clay-900 sm:text-6xl">
            {PublicSite.home.heroHeadlineStart}
            <span className="relative inline-block whitespace-nowrap text-primary">
              {PublicSite.home.heroHeadlineAccent}
              <WavyUnderline />
            </span>
            {PublicSite.home.heroHeadlineEnd}
          </h1>

          <div className="mt-6 font-body text-lg/8 text-clay-500">
            <MarkdownContent locale={locale} markdown={intro} />
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              className="inline-flex items-center rounded-pill border border-primary/35 bg-primary px-6 py-3 font-body font-semibold text-white transition hover:bg-primary-hover focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
              href={`/${locale}/t`}
            >
              {PublicSite.home.startLocalTimer}
            </Link>
            <Link
              className="inline-flex items-center rounded-pill border border-clay-800/20 px-6 py-3 font-body font-semibold text-clay-900 transition hover:border-primary/60 hover:text-primary focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
              href={`/${locale}/t#share`}
            >
              {PublicSite.home.createLiveSession}
            </Link>
          </div>

          <p className="mt-6 font-mono text-xs font-bold tracking-[0.16em] text-clay-400 uppercase">
            {PublicSite.home.trustLine}
          </p>
        </div>
      </section>

      <section className="mt-6 border-t border-clay-800/10 px-6 pt-8 pb-6 sm:px-8 sm:pt-10 sm:pb-8">
        <div className="mx-auto max-w-4xl">
          <MarkdownContent locale={locale} markdown={sections} />
        </div>
      </section>
    </PublicPageFrame>
  )
}
