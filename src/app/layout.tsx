import type { Metadata, Viewport } from "next"
import { Kanit, Roboto, Space_Mono } from "next/font/google"

import "./globals.css"
import ParamStyledBody from "@/components/ParamStyledBody"
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration"
import { defaultAppLocale } from "@/i18n/config"
import { PWA_APP_NAME, PWA_DESCRIPTION, PWA_THEME_COLOR } from "@/app/pwa"

const kanit = Kanit({
  variable: "--font-display-family",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
})

const roboto = Roboto({
  variable: "--font-body-family",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
})

const spaceMono = Space_Mono({
  variable: "--font-mono-family",
  subsets: ["latin"],
  weight: ["400", "700"],
})

export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
}

export const metadata: Metadata = {
  applicationName: PWA_APP_NAME,
  title: PWA_APP_NAME,
  description: PWA_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: PWA_APP_NAME,
  },
  formatDetection: {
    address: false,
    date: false,
    email: false,
    telephone: false,
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang={defaultAppLocale}
      className="h-full"
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/first-paint-theme.js" />
        {/* Favicon for general browsers */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />

        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Microsoft Tiles */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content={PWA_THEME_COLOR} />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Safari Pinned Tab */}
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
      </head>
      <ParamStyledBody
        className={`
          ${kanit.variable}
          ${roboto.variable}
          ${spaceMono.variable}
          h-full antialiased
        `}
      >
        <ServiceWorkerRegistration />
        {children}
      </ParamStyledBody>
    </html>
  )
}
