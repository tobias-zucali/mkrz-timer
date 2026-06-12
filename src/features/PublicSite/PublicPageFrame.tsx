import Link from "next/link"
import type { ReactNode } from "react"

import { infoPageSlugs, type InfoPageSlug } from "@/features/InfoPages/content"
import { getInfoPagePath } from "@/features/InfoPages/routes"
import { getMessagesForLocale } from "@/i18n/messages"
import type { AppLocale } from "@/i18n/config"

import PublicLocaleSwitcher from "./PublicLocaleSwitcher"

function DecorativeBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute top-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/22 blur-3xl" />
      <div className="absolute top-32 right-[8%] h-56 w-56 rounded-full border border-primary/25" />
      <div className="absolute bottom-24 left-[6%] h-32 w-32 rounded-full border border-white/8" />
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
  const { AppShell, InfoPages, PublicSite } = getMessagesForLocale(locale)
  const footerLinks = infoPageSlugs.map((slug) => ({
    href: getInfoPagePath(locale, slug),
    label: InfoPages.footer[slug],
    slug,
  }))

  return (
    <main className="relative min-h-full overflow-hidden bg-background text-foreground">
      <DecorativeBackdrop />
      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col gap-8 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <header className="p-2 sm:p-3">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2">
                <Link
                  className="inline-flex text-2xl font-semibold tracking-tight text-[#f8efe8] underline-offset-4 hover:underline focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                  href={`/${locale}`}
                >
                  {AppShell.metadata.title}
                </Link>
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary/80">
                  {AppShell.footer.credit}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <PublicLocaleSwitcher
                  currentLocale={locale}
                  englishLabel={PublicSite.navigation.languageEnglish}
                  germanLabel={PublicSite.navigation.languageGerman}
                  label={PublicSite.navigation.languageLabel}
                />
                <Link
                  className="rounded-full border border-primary/35 bg-primary/90 px-4 py-2 font-semibold text-background transition hover:bg-primary focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                  href={`/${locale}/t`}
                >
                  {PublicSite.navigation.openTimer}
                </Link>
                <a
                  className="font-medium text-foreground/78 underline decoration-primary/60 underline-offset-4 transition hover:text-foreground"
                  href="https://github.com/tobias-zucali/mkrz-timer"
                  rel="noreferrer"
                  target="_blank"
                >
                  {PublicSite.navigation.github}
                </a>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="p-2 sm:p-3">
          <nav aria-label={InfoPages.footer.navigationLabel}>
            <ul className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-foreground/84">
              {footerLinks.map((link) => (
                <li key={link.slug}>
                  <Link
                    aria-current={currentSlug === link.slug ? "page" : undefined}
                    className="underline decoration-primary/60 underline-offset-4"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  className="underline decoration-primary/60 underline-offset-4"
                  href="https://github.com/tobias-zucali/mkrz-timer"
                  rel="noreferrer"
                  target="_blank"
                >
                  {InfoPages.footer.github}
                </a>
              </li>
            </ul>
          </nav>
        </footer>
      </div>
    </main>
  )
}
