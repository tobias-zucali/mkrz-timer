import { getRequestConfig } from "next-intl/server"

import { resolveAppLocale } from "./locale"
import { getMessagesForLocale } from "./messages"

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = resolveAppLocale(await requestLocale)

  return {
    locale,
    messages: getMessagesForLocale(locale),
  }
})
