import Link from "next/link"
import type { CSSProperties, ReactNode } from "react"

import { infoPageSlugs, type InfoPageSlug } from "@/features/InfoPages/content"
import { getInfoPagePath } from "@/features/InfoPages/routes"
import { getMessagesForLocale } from "@/i18n/messages"
import type { AppLocale } from "@/i18n/config"

import PublicLocaleSwitcher from "./PublicLocaleSwitcher"
import Wordmark from "@/components/Wordmark"
import KnoedelBlob from "@/components/KnoedelBlob"

function blob(
  rotate: number,
  animation: string,
  delay: string,
  duration: string,
): CSSProperties {
  return {
    ["--blob-rotate" as string]: `rotate(${rotate}deg)`,
    animation: `${animation} ${duration} ${delay} infinite`,
  }
}

function DecorativeBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-x-clip"
    >
      {/* left-middle, large */}
      <div className="absolute top-1/3 -left-6 blob-parallax-slow">
        <KnoedelBlob
          className="text-amber-400/30"
          height={200}
          style={blob(20, "blob-float-a", "0s", "9s")}
          width={200}
        />
      </div>
      {/* bottom-left, medium */}
      <div className="absolute bottom-36 -left-12 blob-parallax-fast">
        <KnoedelBlob
          className="text-amber-500/20"
          height={140}
          style={blob(-15, "blob-float-b", "1.2s", "7s")}
          width={140}
        />
      </div>
      {/* top-right, small */}
      <div className="absolute top-30 -right-1 blob-parallax-slow">
        <KnoedelBlob
          className="text-amber-800/20"
          height={90}
          style={blob(35, "blob-float-c", "0.5s", "11s")}
          width={90}
        />
      </div>
      {/* right-middle, medium */}
      <div className="absolute top-1/2 right-4 blob-parallax-medium">
        <KnoedelBlob
          className="text-amber-400/25"
          height={120}
          style={blob(-25, "blob-float-d", "2s", "8s")}
          width={120}
        />
      </div>
      {/* bottom-right, large */}
      <div className="absolute -right-12 bottom-20 blob-parallax-fast">
        <KnoedelBlob
          className="text-amber-500/25"
          height={170}
          style={blob(10, "blob-float-a", "1.8s", "10s")}
          width={170}
        />
      </div>
    </div>
  )
}

export default function PublicPageFrame({
  children,
  currentSlug,
  locale,
}: {
  children: ReactNode
  currentSlug?: InfoPageSlug | "home"
  locale: AppLocale
}) {
  const { InfoPages, PublicSite } = getMessagesForLocale(locale)
  const footerLinks = infoPageSlugs.map((slug) => ({
    href: getInfoPagePath(locale, slug),
    label: InfoPages.footer[slug],
    slug,
  }))

  return (
    <main className="relative h-screen overflow-y-auto bg-sand-100 text-clay-900 public-page-scroll">
      <DecorativeBackdrop />
      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col gap-8 px-4 py-5 sm:p-6 lg:p-8">
        <header className="p-2 sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              className="underline-offset-4 hover:underline focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
              href={`/${locale}`}
            >
              <Wordmark size="sm" />
            </Link>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <PublicLocaleSwitcher
                currentLocale={locale}
                englishLabel={PublicSite.navigation.languageEnglish}
                germanLabel={PublicSite.navigation.languageGerman}
                label={PublicSite.navigation.languageLabel}
              />
              <Link
                className="rounded-pill border border-primary/35 bg-primary px-4 py-2 font-body font-semibold text-white transition hover:bg-primary-hover focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                href={`/${locale}/t`}
              >
                {PublicSite.navigation.openTimer}
              </Link>
            </div>
          </div>
          <p className="mt-6 text-center font-mono text-xs font-bold tracking-[0.18em] text-amber-600">
            {PublicSite.home.heroTagline.split("mkrz lab")[0]}
            <a
              className="underline-offset-2 hover:underline"
              href="https://mkrz.at"
              rel="noreferrer"
              target="_blank"
            >
              mkrz lab
            </a>
            {PublicSite.home.heroTagline.split("mkrz lab")[1]}
          </p>
        </header>
        <div className="flex-1">{children}</div>
      </div>
      <footer className="bg-clay-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              className="focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
              href={`/${locale}`}
            >
              <Wordmark onDark size="sm" />
            </Link>
            <nav aria-label={InfoPages.footer.navigationLabel}>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
                {footerLinks
                  .filter((l) =>
                    ["privacy", "impressum", "accessibility"].includes(l.slug),
                  )
                  .map((link) => (
                    <li key={link.slug}>
                      <Link
                        aria-current={
                          currentSlug === link.slug ? "page" : undefined
                        }
                        className="transition hover:text-white aria-[current=page]:text-primary"
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                <li>
                  <a
                    className="transition hover:text-white"
                    href="https://github.com/tobias-zucali/mkrz-timer"
                    rel="noreferrer"
                    target="_blank"
                  >
                    {InfoPages.footer.github}
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4 font-mono text-xs text-white/40">
            <span>
              {InfoPages.footer.copyright.split("mkrz lab")[0]}
              <a
                className="transition hover:text-white"
                href="https://mkrz.at"
                rel="noreferrer"
                target="_blank"
              >
                mkrz lab
              </a>
              {InfoPages.footer.copyright.split("mkrz lab")[1].split("Tobias Zucali")[0]}
              <a
                className="transition hover:text-white"
                href="https://www.linkedin.com/in/tobias-zucali/"
                rel="noreferrer"
                target="_blank"
              >
                Tobias Zucali
              </a>
              {InfoPages.footer.copyright.split("Tobias Zucali")[1]}
            </span>
            <a
              className="transition hover:text-white"
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
              rel="noreferrer"
              target="_blank"
            >
              {InfoPages.footer.license}
            </a>
          </div>
        </div>
      </footer>
    </main>
  )
}
