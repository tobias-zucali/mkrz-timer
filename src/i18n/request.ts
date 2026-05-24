import { getRequestConfig } from "next-intl/server"

import { defaultAppLocale } from "./config"
import { getMessagesForLocale } from "./messages"

export default getRequestConfig(async () => ({
  locale: defaultAppLocale,
  messages: getMessagesForLocale(defaultAppLocale),
}))
