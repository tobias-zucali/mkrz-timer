import type { AppLocale } from "@/i18n/config"

export const utilityMessagesByLocale = {
  en: {},
  de: {},
} as const satisfies Record<AppLocale, object>
