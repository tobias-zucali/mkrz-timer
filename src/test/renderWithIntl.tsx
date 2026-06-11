import { type ReactElement } from "react"

import { render } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import { defaultAppLocale, type AppLocale } from "@/i18n/config"
import { getMessagesForLocale } from "@/i18n/messages"

export function renderWithIntl(
  ui: ReactElement,
  { locale = defaultAppLocale }: { locale?: AppLocale } = {},
) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={getMessagesForLocale(locale)}
    >
      {ui}
    </NextIntlClientProvider>,
  )
}
