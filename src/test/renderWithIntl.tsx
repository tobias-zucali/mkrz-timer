import { type ReactElement } from "react"

import { render } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { defaultAppLocale } from "@/i18n/config"
import { getMessagesForLocale } from "@/i18n/messages"

export function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider
      locale={defaultAppLocale}
      messages={getMessagesForLocale(defaultAppLocale)}
    >
      {ui}
    </NextIntlClientProvider>,
  )
}
