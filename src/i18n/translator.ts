import { createTranslator } from "next-intl"

import { defaultAppLocale, type AppLocale } from "./config.ts"
import { getMessagesForLocale } from "./messages.ts"

export function createAppTranslator(locale: AppLocale = defaultAppLocale) {
  return createTranslator({
    locale,
    messages: getMessagesForLocale(locale),
  })
}

export type AppTranslationFn = (
  key: string,
  values?: Record<string, unknown>,
) => string
