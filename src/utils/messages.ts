import type { AppLocale } from "@/i18n/config"

import enMessages from "./liveSessionStatus/messages/en.json" with { type: "json" }
import deMessages from "./liveSessionStatus/messages/de.json" with { type: "json" }

export const utilityMessagesByLocale = {
  en: { liveSessionStatus: enMessages },
  de: { liveSessionStatus: deMessages },
} as const satisfies Record<AppLocale, object>
