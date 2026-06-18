import type { AppLocale } from "@/i18n/config"

import appShellEnMessages from "./AppShell/messages/en.json" with { type: "json" }
import appShellDeMessages from "./AppShell/messages/de.json" with { type: "json" }
import infoPagesEnMessages from "./InfoPages/messages/en.json" with { type: "json" }
import infoPagesDeMessages from "./InfoPages/messages/de.json" with { type: "json" }
import publicSiteEnMessages from "./PublicSite/messages/en.json" with { type: "json" }
import publicSiteDeMessages from "./PublicSite/messages/de.json" with { type: "json" }
import timerPageEnMessages from "./TimerPage/messages/en.json" with { type: "json" }
import timerPageDeMessages from "./TimerPage/messages/de.json" with { type: "json" }

export const featureMessagesByLocale = {
  en: {
    AppShell: appShellEnMessages,
    InfoPages: infoPagesEnMessages,
    PublicSite: publicSiteEnMessages,
    TimerPage: timerPageEnMessages,
  },
  de: {
    AppShell: appShellDeMessages,
    InfoPages: infoPagesDeMessages,
    PublicSite: publicSiteDeMessages,
    TimerPage: timerPageDeMessages,
  },
} as const satisfies Record<AppLocale, object>
