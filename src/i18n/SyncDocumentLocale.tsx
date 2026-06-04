"use client"

import { useEffect } from "react"

import type { AppLocale } from "./config"

export default function SyncDocumentLocale({ locale }: { locale: AppLocale }) {
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return null
}
