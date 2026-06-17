import Link from "next/link"

import { getInfoPagePath } from "@/features/InfoPages/routes"
import type { AppLocale } from "@/i18n/config"
import { getMessagesForLocale } from "@/i18n/messages"

export default function GoodToKnowSection({ locale }: { locale: AppLocale }) {
  const { PublicSite } = getMessagesForLocale(locale)

  const linkCn =
    "mt-3 inline-flex font-body text-sm font-semibold text-primary transition hover:text-primary-hover"

  return (
    <section className="border-t border-clay-800/10 px-6 pt-10 pb-12 sm:px-8 sm:pt-14 sm:pb-16">
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs font-bold tracking-[0.16em] text-amber-600 uppercase">
          {PublicSite.home.goodToKnowTagline}
        </p>
        <div className="mt-6 grid gap-8 sm:grid-cols-3">
          <div>
            <h3 className="font-display text-xl font-semibold text-clay-900">
              {PublicSite.home.privateByDesignTitle}
            </h3>
            <p className="mt-2 font-body text-sm text-clay-500">
              {PublicSite.home.privateByDesignBody}
            </p>
            <Link className={linkCn} href={getInfoPagePath(locale, "privacy")}>
              {PublicSite.home.privateByDesignLink} →
            </Link>
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-clay-900">
              {PublicSite.home.openSourceTitle}
            </h3>
            <p className="mt-2 font-body text-sm text-clay-500">
              {PublicSite.home.openSourceBody}
            </p>
            <a
              className={linkCn}
              href="https://github.com/tobias-zucali/mkrz-timer"
              rel="noreferrer"
              target="_blank"
            >
              {PublicSite.home.openSourceLink} →
            </a>
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold text-clay-900">
              {PublicSite.home.fromMkrzLabTitle}
            </h3>
            <p className="mt-2 font-body text-sm text-clay-500">
              {PublicSite.home.fromMkrzLabBody}
            </p>
            <a
              className={linkCn}
              href="https://mkrz.at"
              rel="noreferrer"
              target="_blank"
            >
              {PublicSite.home.fromMkrzLabLink} →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
