import type { Metadata } from "next"
import type { ReactNode } from "react"
import { setRequestLocale } from "next-intl/server"

import { appLocales } from "@/i18n/config"
import { resolveAppLocale } from "@/i18n/locale"
import { getMessagesForLocale } from "@/i18n/messages"
import SyncDocumentLocale from "@/i18n/SyncDocumentLocale"

export function generateStaticParams() {
  return appLocales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: requestedLocale } = await params
  const locale = resolveAppLocale(requestedLocale)
  const appShellMessages = getMessagesForLocale(locale).AppShell

  return {
    title: appShellMessages.metadata.title,
    description: appShellMessages.metadata.description,
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  const resolvedLocale = resolveAppLocale(locale)
  const appShellMessages = getMessagesForLocale(resolvedLocale).AppShell

  setRequestLocale(resolvedLocale)

  return (
    <>
      <SyncDocumentLocale locale={resolvedLocale} />
      {children}
      <a
        className="
          absolute right-4 bottom-4 underline
          hover:text-primary
        "
        href="https://www.mkrz.at/"
      >
        {appShellMessages.footer.credit}
      </a>
    </>
  )
}
