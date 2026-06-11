"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"

import ActionDialog from "@/components/ActionDialog"
import MarkdownContent from "@/features/InfoPages/MarkdownContent"
import type { InfoPageContent } from "@/features/InfoPages/content"
import type { AppLocale } from "@/i18n/config"

const WELCOME_BANNER_DISMISSAL_STORAGE_KEY = "timer.welcomeBanner.v1.dismissed"

export default function WelcomeBanner({
  hasInitializedStoredTimerLibrary,
  hasMeaningfulSearchParams,
  hasStoredLocalContext,
  isRemoteRoute,
  locale,
  welcomeContent,
}: {
  hasInitializedStoredTimerLibrary: boolean
  hasMeaningfulSearchParams: boolean
  hasStoredLocalContext: boolean
  isRemoteRoute: boolean
  locale: AppLocale
  welcomeContent: InfoPageContent
}) {
  const t = useTranslations("InfoPages.welcomeBanner")
  const [hasLoadedDismissalState, setHasLoadedDismissalState] = useState(false)
  const [hideOnFutureVisits, setHideOnFutureVisits] = useState(false)
  const [hasClosedWelcome, setHasClosedWelcome] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const dismissWelcome = () => {
    if (hideOnFutureVisits) {
      window.localStorage.setItem(WELCOME_BANNER_DISMISSAL_STORAGE_KEY, "1")
      setIsDismissed(true)
    } else {
      window.localStorage.removeItem(WELCOME_BANNER_DISMISSAL_STORAGE_KEY)
      setIsDismissed(false)
    }

    setHasClosedWelcome(true)
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    setIsDismissed(
      window.localStorage.getItem(WELCOME_BANNER_DISMISSAL_STORAGE_KEY) === "1",
    )
    setHasLoadedDismissalState(true)
  }, [])

  const shouldShow = useMemo(() => {
    if (!hasInitializedStoredTimerLibrary || !hasLoadedDismissalState) {
      return false
    }

    if (
      hasClosedWelcome ||
      isDismissed ||
      isRemoteRoute ||
      hasMeaningfulSearchParams
    ) {
      return false
    }

    return !hasStoredLocalContext
  }, [
    hasInitializedStoredTimerLibrary,
    hasClosedWelcome,
    hasLoadedDismissalState,
    hasMeaningfulSearchParams,
    hasStoredLocalContext,
    isDismissed,
    isRemoteRoute,
  ])

  if (!shouldShow) {
    return null
  }

  const welcomeMarkdown = welcomeContent.body.replace(/^#\s+[^\n]+\n+/, "")

  return (
    <ActionDialog
      actions={[
        {
          label: t("dismiss"),
          onClick: dismissWelcome,
          size: "small",
          tone: "primary",
        },
      ]}
      eyebrow={t("eyebrow")}
      description=""
      onClose={dismissWelcome}
      size="large"
      title={welcomeContent.title}
    >
      <div className="mt-5 text-left">
        <MarkdownContent compact locale={locale} markdown={welcomeMarkdown} />
        <label
          className="
            mt-6 flex items-start gap-3 text-sm/6 text-foreground/82
          "
        >
          <input
            checked={hideOnFutureVisits}
            className="
              mt-1 size-4 rounded-sm border border-foreground/24 bg-transparent
              accent-primary
            "
            onChange={(event) => setHideOnFutureVisits(event.target.checked)}
            type="checkbox"
          />
          <span>{t("hide")}</span>
        </label>
      </div>
    </ActionDialog>
  )
}
