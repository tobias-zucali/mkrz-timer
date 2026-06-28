import { Suspense } from "react"

import RedirectCurrentPathToLocale from "@/i18n/RedirectCurrentPathToLocale"
import LocaleProvider from "@/i18n/LocaleProvider"
import { isAppLocale, resolveAppLocale } from "@/i18n/locale"

import TimerPage from "@/features/TimerPage"

export default function TimerPageRoute({
  requestedLocale,
}: {
  requestedLocale: string
}) {
  const locale = resolveAppLocale(requestedLocale)

  return (
    <LocaleProvider defaultLocale={locale}>
      {!isAppLocale(requestedLocale) ? (
        <Suspense fallback={null}>
          <RedirectCurrentPathToLocale locale={locale} />
        </Suspense>
      ) : null}
      <TimerPage />
    </LocaleProvider>
  )
}
