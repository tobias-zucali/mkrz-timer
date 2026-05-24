import type { AppLocale } from "@/i18n/config"

import appShellEnMessages from "./AppShell/messages/en.json" with { type: "json" }
import timerPageEnMessages from "./TimerPage/messages/en.json" with { type: "json" }

export const featureMessagesByLocale = {
  en: {
    AppShell: appShellEnMessages,
    TimerPage: timerPageEnMessages,
  },
} as const satisfies Record<AppLocale, object>
