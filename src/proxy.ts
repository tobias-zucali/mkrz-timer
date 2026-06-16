import createMiddleware from "next-intl/middleware"

import { appLocales, defaultAppLocale } from "./i18n/config"

export default createMiddleware({
  locales: appLocales,
  defaultLocale: defaultAppLocale,
  localePrefix: "always",
})

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
}
