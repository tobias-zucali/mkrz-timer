"use client"

import { useLocale, useTranslations } from "next-intl"

import SegmentedControl from "@/components/SegmentedControl"
import type { AppLocale } from "@/i18n/config"
import { useLocaleContext } from "@/i18n/LocaleProvider"

export default function LocaleSwitcher() {
  const currentLocale = useLocale() as AppLocale
  const t = useTranslations("Sidebar.settings")
  const { setLocale } = useLocaleContext()

  return (
    <SegmentedControl
      label={t("languageHeading")}
      onChange={setLocale}
      options={[
        { label: t("languageEnglish"), value: "en" },
        { label: t("languageGerman"), value: "de" },
      ]}
      value={currentLocale}
    />
  )
}
