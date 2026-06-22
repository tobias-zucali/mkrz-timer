import type { AppLocale } from "@/i18n/config"
import { getMessagesForLocale } from "@/i18n/messages"

import ExampleCard from "@/components/ExampleCard"
import { buildExampleTimerUrl, EXAMPLES } from "@/components/ExampleCard/examplesData"

export default function ExamplesSection({ locale }: { locale: AppLocale }) {
  const { PublicSite } = getMessagesForLocale(locale)

  const localExamples = EXAMPLES.filter((e) => e.scope === "local")
  const liveExamples = EXAMPLES.filter((e) => e.scope === "live")

  return (
    <section className="border-t border-clay-800/10 px-6 pt-10 pb-12 sm:px-8 sm:pt-14 sm:pb-16">
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs font-bold tracking-[0.16em] text-amber-600 uppercase">
          {PublicSite.home.examplesTagline}
        </p>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-clay-900 sm:text-5xl">
          {PublicSite.home.examplesHeadline}
        </h2>
        <p className="mt-4 font-body text-lg text-clay-500">
          {PublicSite.home.examplesSubtitle}
        </p>

        <div className="mt-10 space-y-10">
          <div>
            <p className="font-mono text-xs font-bold tracking-[0.14em] text-clay-400 uppercase">
              {PublicSite.home.examplesScopeLocal}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {localExamples.map((example) => (
                <ExampleCard
                  example={example}
                  key={example.id}
                  timerUrl={buildExampleTimerUrl(locale, example)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-xs font-bold tracking-[0.14em] text-clay-400 uppercase">
              {PublicSite.home.examplesScopeLive}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {liveExamples.map((example) => (
                <ExampleCard
                  example={example}
                  key={example.id}
                  timerUrl={buildExampleTimerUrl(locale, example)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
