import { defaultAppLocale, type AppLocale } from "./config.ts"

import { componentMessagesByLocale } from "../components/messages.ts"
import { featureMessagesByLocale } from "../features/messages.ts"
import { utilityMessagesByLocale } from "../utils/messages.ts"

export const messagesByLocale = {
  en: {
    ...featureMessagesByLocale.en,
    ...componentMessagesByLocale.en,
    ...utilityMessagesByLocale.en,
  },
} as const satisfies Record<AppLocale, object>

export type AppMessages = (typeof messagesByLocale)[AppLocale]

export function getMessagesForLocale<Namespace extends keyof AppMessages>(
  locale: AppLocale = defaultAppLocale,
  namespaces?: readonly Namespace[],
) {
  const messages = messagesByLocale[locale]

  if (!namespaces) {
    return messages
  }

  return Object.fromEntries(
    namespaces.map((namespace) => [namespace, messages[namespace]]),
  ) as Pick<AppMessages, Namespace>
}
