import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import ParamStyledBody from "@/components/ParamStyledBody"
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration"
import { defaultAppLocale } from "@/i18n/config"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "mkrz timer",
  description: "simple time keeping",
}

export const viewport: Viewport = {
  themeColor: "#dddddd",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang={defaultAppLocale} className="h-full">
      <head>
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
          by mkrz
        </a>
      </ParamStyledBody>
    </html>
  )
}
