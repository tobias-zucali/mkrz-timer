import { type ReactElement } from "react"

import { render } from "@testing-library/react"

import { defaultAppLocale, type AppLocale } from "@/i18n/config"
import LocaleProvider from "@/i18n/LocaleProvider"

export function renderWithIntl(
  ui: ReactElement,
  { locale = defaultAppLocale }: { locale?: AppLocale } = {},
) {
  return render(<LocaleProvider defaultLocale={locale}>{ui}</LocaleProvider>)
}
