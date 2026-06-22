import { getHomeContent } from "@/features/InfoPages/content"
import type { AppLocale } from "@/i18n/config"
import { getMessagesForLocale } from "@/i18n/messages"

import PublicPageFrame from "../PublicPageFrame"
import ExamplesSection from "./ExamplesSection"
import GoodToKnowSection from "./GoodToKnowSection"
import { WavyUnderline } from "./icons"
import TwoWaysSection from "./TwoWaysSection"

export function buildHomePageMetadata(locale: AppLocale) {
  const content = getHomeContent(locale)
  return {
    description: content.description,
    title: content.title,
  }
}

export default function HomePage({ locale }: { locale: AppLocale }) {
  const { PublicSite } = getMessagesForLocale(locale)

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

          <p className="mt-6 font-body text-lg/8 text-clay-500">
            {PublicSite.home.heroSubtitle}
          </p>

          <p className="mt-10 font-mono text-xs font-bold tracking-[0.16em] text-clay-400 uppercase">
            {PublicSite.home.trustLine}
          </p>
        </div>
      </section>

      <ExamplesSection locale={locale} />
      <TwoWaysSection locale={locale} />
      <GoodToKnowSection locale={locale} />
    </PublicPageFrame>
  )
}
