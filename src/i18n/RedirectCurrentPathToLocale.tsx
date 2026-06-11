"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import type { AppLocale } from "./config"
import { getBrowserLocale, localizePathname } from "./locale"

type RedirectCurrentPathToLocaleProps = {
  locale?: AppLocale
}

export default function RedirectCurrentPathToLocale({
  locale,
}: RedirectCurrentPathToLocaleProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const targetLocale = locale ?? getBrowserLocale()

  useEffect(() => {
    const nextPathname = localizePathname(pathname, targetLocale)
    const nextSearch = searchParams.toString()
    const nextUrl = nextSearch ? `${nextPathname}?${nextSearch}` : nextPathname

    if (nextUrl !== `${pathname}${nextSearch ? `?${nextSearch}` : ""}`) {
      window.location.replace(nextUrl)
    }
  }, [pathname, searchParams, targetLocale])

  return null
}
