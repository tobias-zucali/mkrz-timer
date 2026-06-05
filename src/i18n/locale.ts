import { appLocales, defaultAppLocale, type AppLocale } from "./config.ts"

export function isAppLocale(locale: string): locale is AppLocale {
  return appLocales.includes(locale as AppLocale)
}

function localeMatchesAppLocale(locale: string, appLocale: AppLocale) {
  const normalizedLocale = locale.toLowerCase()
  const normalizedAppLocale = appLocale.toLowerCase()

  return (
    normalizedLocale === normalizedAppLocale ||
    normalizedLocale.startsWith(`${normalizedAppLocale}-`)
  )
}

export function resolveAppLocale(locale?: string | null): AppLocale {
  if (!locale) {
    return defaultAppLocale
  }

  const matchingLocale = appLocales.find((appLocale) =>
    localeMatchesAppLocale(locale, appLocale),
  )

  return matchingLocale ?? defaultAppLocale
}

export function resolvePreferredAppLocale(
  locales?: readonly string[] | null,
  fallbackLocale?: string | null,
): AppLocale {
  for (const locale of locales ?? []) {
    const matchingLocale = appLocales.find((appLocale) =>
      localeMatchesAppLocale(locale, appLocale),
    )

    if (matchingLocale) {
      return matchingLocale
    }
  }

  return resolveAppLocale(fallbackLocale)
}

export function getPathLocale(pathname: string): AppLocale | null {
  const [, localeSegment] = pathname.split("/")

  return localeSegment && isAppLocale(localeSegment) ? localeSegment : null
}

export function stripLocalePrefix(pathname: string) {
  const locale = getPathLocale(pathname)

  if (!locale) {
    return pathname || "/"
  }

  const suffix = pathname.slice(`/${locale}`.length)

  return suffix.startsWith("/")
    ? suffix
    : suffix.length > 0
      ? `/${suffix}`
      : "/"
}

export function localizePathname(pathname: string, locale: AppLocale) {
  const normalizedPathname = stripLocalePrefix(pathname)

  return normalizedPathname === "/"
    ? `/${locale}`
    : `/${locale}${normalizedPathname}`
}

export function getDocumentLocale() {
  if (typeof document === "undefined") {
    return defaultAppLocale
  }

  return resolveAppLocale(document.documentElement.lang)
}

export function getBrowserLocale() {
  if (typeof navigator === "undefined") {
    return defaultAppLocale
  }

  return resolvePreferredAppLocale(navigator.languages, navigator.language)
}
