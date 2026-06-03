import { NextIntlClientProvider } from "next-intl"

import RedirectCurrentPathToLocale from "@/i18n/RedirectCurrentPathToLocale"
import { isAppLocale, resolveAppLocale } from "@/i18n/locale"
import { getMessagesForLocale } from "@/i18n/messages"

import TimerPage from "./index"

const timerPageNamespaces = [
  "AppShell",
  "CloseButton",
  "DeveloperReportDialog",
  "DigitalDisplay",
  "HelpText",
  "QrCodeOverlay",
  "Sidebar",
  "StatusBadge",
  "SyncConflictDialog",
  "Timer",
  "TimerPage",
  "TimerTitle",
  "TopRightControls",
  "UrlCopyField",
] as const

export default function TimerPageRoute({
  requestedLocale,
}: {
  requestedLocale: string
}) {
  const locale = resolveAppLocale(requestedLocale)
  const messages = getMessagesForLocale(locale, timerPageNamespaces)

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {!isAppLocale(requestedLocale) ? (
        <RedirectCurrentPathToLocale locale={locale} />
      ) : null}
      <TimerPage />
    </NextIntlClientProvider>
  )
}
