import Link from "next/link"

import type { AppLocale } from "@/i18n/config"
import { getMessagesForLocale } from "@/i18n/messages"

import { CheckIcon, DeviceIcon, GroupIcon } from "./icons"

const liveSessionButtonCn =
  "inline-flex items-center rounded-2xl border-2 border-clay-900 px-5 py-2.5 font-body font-semibold text-clay-900 transition hover:border-primary hover:text-primary focus:outline-2 focus:-outline-offset-2 focus:outline-primary"

export default function TwoWaysSection({ locale }: { locale: AppLocale }) {
  const { PublicSite } = getMessagesForLocale(locale)

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
              <Link className={liveSessionButtonCn} href={`/${locale}/t#share`}>
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
  )
}
