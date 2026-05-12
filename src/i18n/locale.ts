import { appLocales, defaultAppLocale, type AppLocale } from "./config.ts"

export function resolveAppLocale(locale?: string | null): AppLocale {
  if (!locale) {
    return defaultAppLocale
  }

  const normalizedLocale = locale.toLowerCase()
  const matchingLocale = appLocales.find(
    (appLocale) =>
      normalizedLocale === appLocale.toLowerCase() ||
      normalizedLocale.startsWith(`${appLocale.toLowerCase()}-`),
  )

  return matchingLocale ?? defaultAppLocale
}

export function getDocumentLocale() {
  if (typeof document === "undefined") {
    return defaultAppLocale
  }

  return resolveAppLocale(document.documentElement.lang)
}
