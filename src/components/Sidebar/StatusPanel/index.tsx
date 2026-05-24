"use client"

import { type ReactNode, useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"

import DeveloperReportDialog from "@/components/DeveloperReportDialog"
import type { AppTranslationFn } from "@/i18n/translator"
import type { SessionParticipant } from "@/shared/remoteSession/types"
import { getPublicBuildInfo } from "@/shared/buildInfo"
import ActionButton from "@/utils/ActionButton"
import type { RemoteRelayReachabilityState } from "@/utils/remoteSession/useRemoteRelayReachability"
import type { SessionPresentationModel } from "@/utils/sessionPresentation"
import { getTimerSpaceShortcutButtonProps } from "@/utils/timerShortcutButtons"

import {
  formatRelativeTimestamp,
  getNetworkLabel,
  getRelayReachabilityLabel,
  splitTimelineEntry,
} from "@/components/StatusBadge/statusHelpers"

import { getParticipantSummary } from "../participantSummary"

type RemoteStatusConnection = {
  id: string
  isAlive: boolean
  participantLabel: "Control" | "View" | "You"
}

function getParticipantLabel(
  participantLabel: RemoteStatusConnection["participantLabel"],
  t: ReturnType<typeof useTranslations>,
) {
  switch (participantLabel) {
    case "Control":
      return t("participantControl")
    case "View":
      return t("participantView")
    case "You":
      return t("participantYou")
  }
}

function DisclosureSection({
  children,
  defaultOpen = false,
  testId,
  title,
}: {
  children: ReactNode
  defaultOpen?: boolean
  testId: string
  title: string
}) {
  const t = useTranslations("Sidebar.status")
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className="rounded-2xl border border-foreground/10 bg-foreground/4">
      <button
        aria-controls={`${testId}-content`}
        aria-expanded={isOpen}
        className="
          flex w-full cursor-pointer items-center justify-between gap-3 px-4
          py-3 text-left
        "
        data-testid={`${testId}-toggle`}
        onClick={() => setIsOpen((current) => !current)}
        {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
        type="button"
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span
          className="
          text-xs font-medium tracking-[0.12em] text-foreground/52 uppercase
        "
        >
          {isOpen ? t("hide") : t("show")}
        </span>
      </button>
      {isOpen && (
        <div
          className="border-t border-foreground/10 p-4"
          id={`${testId}-content`}
        >
          {children}
        </div>
      )}
    </section>
  )
}

export default function StatusPanel({
  activityLog,
  connectionDetails,
  errorText,
  floatingTimerErrorText,
  getErrorReportBody,
  isOnline,
  isRetrying,
  localClientId,
  onRetry,
  participants,
  relayLabel,
  relayReachability,
  sessionPresentation,
  sessionId,
}: {
  activityLog: string[]
  connectionDetails: RemoteStatusConnection[]
  errorText: string | null
  floatingTimerErrorText: string | null
  getErrorReportBody: () => string
  isOnline: boolean | null
  isRetrying: boolean
  localClientId: string
  onRetry: () => void
  participants: SessionParticipant[]
  relayLabel: string
  relayReachability: RemoteRelayReachabilityState
  sessionPresentation: SessionPresentationModel
  sessionId?: string
}) {
  const t = useTranslations("Sidebar.status")
  const tParticipantSummary = useTranslations("Sidebar.participantSummary")
  const tStatusBadge = useTranslations("StatusBadge")
  const locale = useLocale()
  const [isReportOverlayOpen, setIsReportOverlayOpen] = useState(false)
  const [relativeNow, setRelativeNow] = useState(() => Date.now())

  useEffect(() => {
    setRelativeNow(Date.now())

    const intervalId = window.setInterval(() => {
      setRelativeNow(Date.now())
    }, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const networkLabel = getNetworkLabel(isOnline, t as AppTranslationFn)
  const relayReachabilityLabel = getRelayReachabilityLabel(
    relayReachability,
    t as AppTranslationFn,
  )
  const displayStateLabel = errorText
    ? tStatusBadge("error")
    : floatingTimerErrorText
      ? tStatusBadge("attentionNeeded")
      : sessionPresentation.statusPanel.stateLabel
  const displayDescription = floatingTimerErrorText
    ? t("localFeatureIssue")
    : sessionPresentation.statusPanel.description
  const hasLiveSessionDetails =
    sessionPresentation.state !== "local" &&
    sessionPresentation.state !== "liveEnded"
  const participantCountLabel = getParticipantSummary({
    localClientId,
    participants,
    t: tParticipantSummary as AppTranslationFn,
  })
  const { buildId, buildLabel } = getPublicBuildInfo()

  return (
    <>
      <div className="space-y-6" data-testid="remote-status-panel">
        <section className="space-y-4">
          <h3 className="text-base font-semibold text-foreground">
            {t("heading")}
          </h3>
          {errorText && (
            <div
              className="
                rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm
                text-red-100
              "
              data-testid="remote-status-error"
              role="alert"
            >
              <p className="font-semibold text-red-50">{t("latestIssue")}</p>
              <p className="mt-1 leading-6 wrap-anywhere">{errorText}</p>
            </div>
          )}
          {floatingTimerErrorText && (
            <div
              className="
                rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3
                text-sm text-amber-100
              "
              data-testid="status-floating-timer-error"
              role="alert"
            >
              <p className="font-semibold text-amber-50">
                {t("floatingTimerIssue")}
              </p>
              <p className="mt-1 leading-6">{floatingTimerErrorText}</p>
            </div>
          )}
          {sessionPresentation.state === "liveConflict" && (
            <ActionButton
              data-testid="remote-status-retry"
              disabled={isRetrying}
              onClick={onRetry}
            >
              {isRetrying ? t("retrying") : t("retryConnection")}
            </ActionButton>
          )}
          <div
            className="
            rounded-2xl border border-foreground/10 bg-white/4 p-4
          "
          >
            <dl
              className="
              grid gap-2 text-sm text-foreground/80
              sm:grid-cols-[auto_1fr] sm:gap-x-3
            "
            >
              <dt className="font-medium text-foreground">{t("session")}</dt>
              <dd data-testid="remote-status-session">
                {sessionPresentation.statusPanel.sessionLabel}
              </dd>
              <dt className="font-medium text-foreground">{t("state")}</dt>
              <dd data-testid="remote-status-state">{displayStateLabel}</dd>
              <dt className="font-medium text-foreground">{t("access")}</dt>
              <dd data-testid="remote-status-role">
                {sessionPresentation.statusPanel.accessLabel}
              </dd>
              <dt className="font-medium text-foreground">
                {t("liveSession")}
              </dt>
              <dd data-testid="remote-status-link">
                {sessionPresentation.statusPanel.summaryLabel}
              </dd>
              {hasLiveSessionDetails && (
                <>
                  <dt className="font-medium text-foreground">
                    {t("participants")}
                  </dt>
                  <dd data-testid="remote-status-participant-count">
                    {participantCountLabel}
                  </dd>
                </>
              )}
              <dt className="font-medium text-foreground">{t("build")}</dt>
              <dd
                className="font-mono text-xs text-foreground/72"
                data-testid="remote-status-build"
                title={buildId}
              >
                {buildLabel}
              </dd>
            </dl>
            <p
              className="mt-4 text-sm/6 text-foreground/66"
              data-testid="remote-status-description"
            >
              {displayDescription}
            </p>
          </div>
          <ActionButton
            className="
              min-h-9 border border-foreground/12 bg-foreground/6 px-3 py-1.5
              text-xs text-foreground/78
              hover:border-foreground/18 hover:bg-foreground/10
              hover:text-foreground
            "
            onClick={() => setIsReportOverlayOpen(true)}
          >
            {t("sendToDeveloper")}
          </ActionButton>
        </section>

        <DisclosureSection
          testId="remote-status-details"
          title={t("connectionDetails")}
        >
          <dl
            className="
            grid gap-2 text-sm text-foreground/80
            sm:grid-cols-[auto_1fr] sm:gap-x-3
          "
          >
            <dt className="font-medium text-foreground">{t("network")}</dt>
            <dd data-testid="remote-status-network">{networkLabel}</dd>
            {hasLiveSessionDetails && (
              <>
                <dt className="font-medium text-foreground">{t("access")}</dt>
                <dd data-testid="remote-status-session-role">
                  {sessionPresentation.roleChipLabel}
                </dd>
                <dt className="font-medium text-foreground">
                  {t("sessionId")}
                </dt>
                <dd
                  className="font-mono text-xs text-foreground/72"
                  data-testid="remote-status-session-id"
                >
                  {sessionId ?? t("unavailable")}
                </dd>
                <dt className="font-medium text-foreground">
                  {t("relayReachability")}
                </dt>
                <dd data-testid="remote-status-relay-reachability">
                  {relayReachabilityLabel}
                </dd>
                <dt className="font-medium text-foreground">{t("relay")}</dt>
                <dd data-testid="remote-status-relay">{relayLabel}</dd>
              </>
            )}
          </dl>
          {hasLiveSessionDetails && (
            <div className="mt-4 space-y-3">
              <h4
                className="
                text-xs font-medium tracking-[0.12em] text-foreground/58
                uppercase
              "
              >
                {t("participantsHeading")}
              </h4>
              <ul
                className="
                  space-y-2 rounded-2xl border border-foreground/10
                  bg-foreground/4 p-3
                "
                data-testid="remote-status-connections"
              >
                {connectionDetails.length > 0 ? (
                  connectionDetails.map((detail) => (
                    <li
                      className="
                        flex items-center justify-between gap-3 text-sm
                      "
                      data-testid="remote-status-connection"
                      key={detail.id}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="
                          shrink-0 rounded-full border border-foreground/12 px-2
                          py-0.5 text-[10px] font-semibold tracking-[0.12em]
                          text-foreground/72 uppercase
                        "
                        >
                          {getParticipantLabel(detail.participantLabel, t)}
                        </span>
                        <span
                          className="
                          truncate font-mono text-xs text-foreground/68
                        "
                        >
                          {detail.id}
                        </span>
                      </span>
                      <span className="text-foreground/72">
                        {detail.isAlive
                          ? t("participantLive")
                          : t("participantStale")}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-foreground/68">
                    {t("noParticipants")}
                  </li>
                )}
              </ul>
            </div>
          )}
        </DisclosureSection>

        {activityLog.length > 0 && (
          <DisclosureSection
            testId="remote-status-activity"
            title={t("recentActivity")}
          >
            <ul className="space-y-2" data-testid="remote-status-activity-log">
              {activityLog.map((entry, index) => {
                const { detail, timestamp } = splitTimelineEntry(entry)
                return (
                  <li
                    className="flex items-start justify-between gap-3 text-sm"
                    data-testid="remote-status-activity-entry"
                    key={`${entry}-${index}`}
                  >
                    <span className="text-foreground/72">{detail}</span>
                    <span className="shrink-0 text-xs text-foreground/52">
                      {formatRelativeTimestamp(timestamp, relativeNow, locale)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </DisclosureSection>
        )}
      </div>
      <DeveloperReportDialog
        getReportBody={getErrorReportBody}
        isOpen={isReportOverlayOpen}
        onClose={() => setIsReportOverlayOpen(false)}
      />
    </>
  )
}
