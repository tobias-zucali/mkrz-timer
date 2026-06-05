export const appLocales = ["en", "de"] as const

export type AppLocale = (typeof appLocales)[number]

export const defaultAppLocale: AppLocale = "en"
