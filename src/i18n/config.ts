export const appLocales = ["en"] as const

export type AppLocale = (typeof appLocales)[number]

export const defaultAppLocale: AppLocale = "en"
