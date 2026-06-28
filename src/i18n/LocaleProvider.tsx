"use client"

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { NextIntlClientProvider } from "next-intl"

import { type AppLocale } from "./config"
import { localizePathname, stripLocalePrefix } from "./locale"
import { messagesByLocale } from "./messages"

type LocaleContextValue = {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function useLocaleContext() {
  const ctx = useContext(LocaleContext)
  if (!ctx)
    throw new Error("useLocaleContext must be used inside LocaleProvider")
  return ctx
}

type LocaleProviderProps = {
  children: ReactNode
  defaultLocale: AppLocale
}

export default function LocaleProvider({
  children,
  defaultLocale,
}: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<AppLocale>(defaultLocale)

  const setLocale = useCallback((nextLocale: AppLocale) => {
    startTransition(() => {
      setLocaleState(nextLocale)
    })
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale

    const pathname = window.location.pathname
    const search = window.location.search
    const nextPathname = localizePathname(stripLocalePrefix(pathname), locale)
    const nextUrl = search ? `${nextPathname}${search}` : nextPathname

    if (nextUrl !== `${pathname}${search}`) {
      window.history.replaceState(null, "", nextUrl)
    }
  }, [locale])

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider
        locale={locale}
        messages={messagesByLocale[locale]}
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  )
}
