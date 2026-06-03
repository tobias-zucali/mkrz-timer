import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { getLocale } from "next-intl/server"

import "./globals.css"
import ParamStyledBody from "@/components/ParamStyledBody"
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration"
import { resolveAppLocale } from "@/i18n/locale"
import { getMessagesForLocale } from "@/i18n/messages"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const viewport: Viewport = {
  themeColor: "#dddddd",
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = resolveAppLocale(await getLocale())
  const appShellMessages = getMessagesForLocale(locale).AppShell

  return {
    title: appShellMessages.metadata.title,
    description: appShellMessages.metadata.description,
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = resolveAppLocale(await getLocale())
  const appShellMessages = getMessagesForLocale(locale).AppShell

  return (
    <html lang={locale} className="h-full" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/first-paint-theme.js" />
        {/* Favicon for general browsers */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />

        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Microsoft Tiles */}
        <meta name="msapplication-TileColor" content="#00aba9" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Safari Pinned Tab */}
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
      </head>
      <ParamStyledBody
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          h-full antialiased
        `}
      >
        <ServiceWorkerRegistration />
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
      </ParamStyledBody>
    </html>
  )
}
