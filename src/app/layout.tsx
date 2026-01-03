import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ParamStyledBody from "@/components/ParamStyledBody";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "mkrz timer",
  description: "simple time keeping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Favicon for general browsers */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />

        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Android Chrome Icons */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#dddddd" />

        {/* Microsoft Tiles */}
        <meta name="msapplication-TileColor" content="#00aba9" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Safari Pinned Tab */}
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
      </head>
      <ParamStyledBody
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}
      >
        {children}
        <a
          className="absolute bottom-4 right-4 underline hover:text-primary"
          href='https://www.mkrz.at/'
        >by mkrz</a>
      </ParamStyledBody>
    </html>
  );
}
