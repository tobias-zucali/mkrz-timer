import { NextIntlClientProvider } from "next-intl"

import { defaultAppLocale } from "@/i18n/config"
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

export default function TimerPageRoute() {
  const messages = getMessagesForLocale(defaultAppLocale, timerPageNamespaces)

  return (
    <NextIntlClientProvider locale={defaultAppLocale} messages={messages}>
      <TimerPage />
    </NextIntlClientProvider>
  )
}
