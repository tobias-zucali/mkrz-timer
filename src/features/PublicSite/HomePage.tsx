import Link from "next/link"

import MarkdownContent from "@/features/InfoPages/MarkdownContent"
import { getHomeContent } from "@/features/InfoPages/content"
import { getInfoPagePath } from "@/features/InfoPages/routes"
import type { AppLocale } from "@/i18n/config"
import { getMessagesForLocale } from "@/i18n/messages"

import PublicPageFrame from "./PublicPageFrame"

const liveSessionCardButtonCn =
  "inline-flex items-center rounded-2xl border-2 border-clay-900 px-5 py-2.5 font-body font-semibold text-clay-900 transition hover:border-primary hover:text-primary focus:outline-2 focus:-outline-offset-2 focus:outline-primary"

function splitHomeBody(body: string) {
  const [introSource] = body.split("\n## ")
  return { intro: introSource.trim() }
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

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="mt-0.5 size-4 shrink-0 text-primary"
      fill="none"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" fill="currentColor" fillOpacity="0.15" r="8" />
      <path
        d="M5 8l2 2 4-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function DeviceIcon() {
  return (
    <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
      <svg
        aria-hidden="true"
        className="size-5 text-primary"
        fill="none"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect height="14" rx="2" stroke="currentColor" strokeWidth="1.5" width="10" x="5" y="3" />
        <circle cx="10" cy="14.5" fill="currentColor" r="0.75" />
      </svg>
    </div>
  )
}

function GroupIcon() {
  return (
    <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
      <svg
        aria-hidden="true"
        className="size-5 text-primary"
        fill="none"
        viewBox="0 0 20 20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="7.5" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M2 16c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
        <circle cx="14" cy="7" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M17 16c0-2.5-1.5-4-3.5-4.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
      </svg>
    </div>
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
  const { intro } = splitHomeBody(content.body)

  const localFeatures = [
    PublicSite.home.localFeature1,
    PublicSite.home.localFeature2,
    PublicSite.home.localFeature3,
    PublicSite.home.localFeature4,
  ]

  const liveSteps = [
    PublicSite.home.liveStep1,
    PublicSite.home.liveStep2,
    PublicSite.home.liveStep3,
    PublicSite.home.liveStep4,
  ]

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

          <p className="mt-10 font-mono text-xs font-bold tracking-[0.16em] text-clay-400 uppercase">
            {PublicSite.home.trustLine}
          </p>
        </div>
      </section>

      <section className="border-t border-clay-800/10 px-6 pt-10 pb-12 sm:px-8 sm:pt-14 sm:pb-16">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-xs font-bold tracking-[0.16em] text-amber-600 uppercase">
            {PublicSite.home.twoWaysTagline}
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-clay-900 sm:text-5xl">
            {PublicSite.home.twoWaysHeadline}
          </h2>
          <p className="mt-4 font-body text-lg text-clay-500">
            {PublicSite.home.twoWaysSubtitle}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col rounded-2xl border border-clay-800/10 bg-white p-6">
              <p className="font-mono text-xs font-bold tracking-[0.14em] text-amber-600 uppercase">
                {PublicSite.home.localTimerBadge}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <DeviceIcon />
                <h3 className="font-display text-2xl font-semibold text-clay-900">
                  {PublicSite.home.localTimerLabel}
                </h3>
              </div>
              <p className="mt-3 font-body text-clay-500">
                {PublicSite.home.localTimerDescription}
              </p>
              <ul className="mt-4 space-y-2">
                {localFeatures.map((feature) => (
                  <li className="flex items-start gap-2 font-body text-sm text-clay-800" key={feature}>
                    <CheckIcon />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link
                  className="inline-flex items-center rounded-xl border border-primary/35 bg-primary px-5 py-2.5 font-body font-semibold text-white transition hover:bg-primary-hover focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                  href={`/${locale}/t`}
                >
                  {PublicSite.home.startLocalTimer}
                </Link>
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-clay-800/10 bg-white p-6">
              <p className="font-mono text-xs font-bold tracking-[0.14em] text-amber-600 uppercase">
                {PublicSite.home.liveSessionBadge}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <GroupIcon />
                <h3 className="font-display text-2xl font-semibold text-clay-900">
                  {PublicSite.home.liveSessionLabel}
                </h3>
              </div>
              <p className="mt-3 font-body text-clay-500">
                {PublicSite.home.liveSessionDescription}
              </p>
              <ol className="mt-4 space-y-2">
                {liveSteps.map((step, i) => (
                  <li className="flex items-start gap-3 font-body text-sm text-clay-800" key={step}>
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-clay-900 font-mono text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <div className="mt-6">
                <Link
                  className={liveSessionCardButtonCn}
                  href={`/${locale}/t#share`}
                >
                  {PublicSite.home.createLiveSession}
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-8 font-body text-sm text-clay-500">
            {PublicSite.home.twoWaysClosing}
          </p>
        </div>
      </section>

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
              <Link
                className="mt-3 inline-flex font-body text-sm font-semibold text-primary transition hover:text-primary-hover"
                href={getInfoPagePath(locale, "privacy")}
              >
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
                className="mt-3 inline-flex font-body text-sm font-semibold text-primary transition hover:text-primary-hover"
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
                className="mt-3 inline-flex font-body text-sm font-semibold text-primary transition hover:text-primary-hover"
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
    </PublicPageFrame>
  )
}
