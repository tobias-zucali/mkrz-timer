import type { AppLocale } from "@/i18n/config"

import appShellEnMessages from "./AppShell/messages/en.json" with { type: "json" }
import appShellDeMessages from "./AppShell/messages/de.json" with { type: "json" }
import infoPagesEnMessages from "./InfoPages/messages/en.json" with { type: "json" }
import timerPageEnMessages from "./TimerPage/messages/en.json" with { type: "json" }
import timerPageDeMessages from "./TimerPage/messages/de.json" with { type: "json" }

export const featureMessagesByLocale = {
  en: {
    AppShell: appShellEnMessages,
    InfoPages: infoPagesEnMessages,
    TimerPage: timerPageEnMessages,
  },
  de: {
    AppShell: appShellDeMessages,
    InfoPages: infoPagesEnMessages,
    TimerPage: timerPageDeMessages,
  },
} as const satisfies Record<AppLocale, object>
