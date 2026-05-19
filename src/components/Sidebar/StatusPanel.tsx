"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import CloseButton from "@/components/CloseButton"
import { getDocumentLocale } from "@/i18n/locale"
import { getPublicBuildInfo } from "@/shared/buildInfo"
import ActionButton from "@/utils/ActionButton"
import useDialogFocusTrap from "@/utils/useDialogFocusTrap"
import useClipboardCopy from "@/utils/useClipboardCopy"
import type { RemoteRelayReachabilityState } from "@/utils/remoteSession/useRemoteRelayReachability"
import type { RemoteStatusModel } from "@/utils/remoteStatus"
import { getTimerSpaceShortcutButtonProps } from "@/utils/timerShortcutButtons"

import {
  formatRelativeTimestamp,
  getCompactBadgeLabel,
  getNetworkLabel,
  getRelayReachabilityLabel,
  splitTimelineEntry,
} from "@/components/StatusBadge/statusHelpers"

type RemoteStatusConnection = {
  id: string
  isAlive: boolean
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
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.04]">
      <button
        aria-controls={`${testId}-content`}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left"
        data-testid={`${testId}-toggle`}
        onClick={() => setIsOpen((current) => !current)}
        {...getTimerSpaceShortcutButtonProps<HTMLButtonElement>()}
        type="button"
      >
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-foreground/52">
          {isOpen ? "Hide" : "Show"}
        </span>
      </button>
      {isOpen && (
        <div
          className="border-t border-foreground/10 px-4 py-4"
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
  onRetry,
  relayLabel,
  relayReachability,
  remoteStatus,
  sessionId,
}: {
  activityLog: string[]
  connectionDetails: RemoteStatusConnection[]
  errorText: string | null
  floatingTimerErrorText: string | null
  getErrorReportBody: () => string
  isOnline: boolean | null
  isRetrying: boolean
  onRetry: () => void
  relayLabel: string
  relayReachability: RemoteRelayReachabilityState
  remoteStatus: RemoteStatusModel | null
  sessionId?: string
}) {
  const [isReportOverlayOpen, setIsReportOverlayOpen] = useState(false)
  const [reportComment, setReportComment] = useState("")
  const [locale] = useState(() => getDocumentLocale())
  const [relativeNow, setRelativeNow] = useState(() => Date.now())
  const reportDialogRef = useRef<HTMLDivElement>(null)
  const reportCommentRef = useRef<HTMLTextAreaElement>(null)
  const { canCopy, copyText, isCopied } = useClipboardCopy()

  useEffect(() => {
    setRelativeNow(Date.now())

    const intervalId = window.setInterval(() => {
      setRelativeNow(Date.now())
    }, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useDialogFocusTrap({
    active: isReportOverlayOpen,
    defaultFocusRef: reportCommentRef,
    dialogRef: reportDialogRef,
  })

  const networkLabel = getNetworkLabel(isOnline)
  const relayReachabilityLabel = getRelayReachabilityLabel(relayReachability)
  const displayRoleLabel = remoteStatus?.roleLabel ?? "Local timer"
  const displayStateLabel = errorText
    ? (remoteStatus?.stateLabel ?? "Attention needed")
    : floatingTimerErrorText
      ? "Attention needed"
      : (remoteStatus?.stateLabel ?? "Ready")
  const displayDescription = remoteStatus
    ? remoteStatus.description
    : floatingTimerErrorText
      ? "A local feature reported an issue. Review the details below."
      : "Remote mode is off. Open Share when you want to start a remote session."
  const compactRoleLabel = getCompactBadgeLabel(remoteStatus)
  const trimmedReportComment = reportComment.trim()
  const reportBody = getErrorReportBody()
  const liveParticipantCount = connectionDetails.filter(
    (detail) => detail.isAlive,
  ).length
  const participantCountLabel =
    liveParticipantCount === 0
      ? "No participants connected"
      : liveParticipantCount === 1
        ? "1 participant connected"
        : `${liveParticipantCount} participants connected`
  const mailBody = [
    "User comment:",
    trimmedReportComment || "No additional comment provided.",
    "",
    reportBody,
  ].join("\n")
  const { buildId, buildLabel } = getPublicBuildInfo()

  const openMailApp = () => {
    window.location.href = `mailto:timer@mkrz.at?subject=Status%20Report&body=${encodeURIComponent(mailBody)}`
  }

  const reportOverlay =
    isReportOverlayOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            aria-modal="true"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 px-4 py-6 backdrop-blur"
            ref={reportDialogRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="w-full max-w-xl rounded-3xl border border-foreground/12 bg-background p-6 shadow-2xl shadow-background/35">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/80">
                    Support
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">
                    Send diagnostics
                  </h2>
                </div>
                <CloseButton onClick={() => setIsReportOverlayOpen(false)} />
              </div>
              <label className="mt-5 block text-sm font-medium text-foreground">
                What happened?
                <textarea
                  className="mt-2 min-h-28 w-full rounded-2xl border border-foreground/12 bg-foreground/[0.04] px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
                  onChange={(event) => setReportComment(event.target.value)}
                  ref={reportCommentRef}
                  value={reportComment}
                />
              </label>
              <div className="mt-5 flex flex-wrap justify-end gap-3">
                {canCopy && (
                  <ActionButton
                    className="border border-foreground/12 bg-foreground/[0.04] text-foreground hover:border-foreground/18 hover:bg-foreground/[0.08] hover:text-foreground"
                    onClick={() => copyText(mailBody)}
                  >
                    {isCopied ? "Copied" : "Copy report"}
                  </ActionButton>
                )}
                <ActionButton onClick={openMailApp}>
                  Send Email
                </ActionButton>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <div className="space-y-6" data-testid="remote-status-panel">
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-base font-semibold text-foreground">Status</h3>
            <ActionButton
              className="min-h-9 border border-foreground/12 bg-foreground/[0.06] px-3 py-1.5 text-xs text-foreground/78 hover:border-foreground/18 hover:bg-foreground/[0.1] hover:text-foreground"
              onClick={() => setIsReportOverlayOpen(true)}
            >
              Send to developer
            </ActionButton>
          </div>
          {errorText && (
            <div
              className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-100"
              data-testid="remote-status-error"
              role="alert"
            >
              <p className="font-semibold text-red-50">Latest issue</p>
              <p className="mt-1 leading-6">{errorText}</p>
            </div>
          )}
          {floatingTimerErrorText && (
            <div
              className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100"
              data-testid="status-floating-timer-error"
              role="alert"
            >
              <p className="font-semibold text-amber-50">
                Floating timer issue
              </p>
              <p className="mt-1 leading-6">{floatingTimerErrorText}</p>
            </div>
          )}
          {remoteStatus?.canRetryManually && (
            <ActionButton
              data-testid="remote-status-retry"
              disabled={isRetrying}
              onClick={onRetry}
            >
              {isRetrying ? "Retrying..." : "Retry connection"}
            </ActionButton>
          )}
          <div className="rounded-2xl border border-foreground/10 bg-white/[0.04] p-4">
            <dl className="grid gap-2 text-sm text-foreground/80 sm:grid-cols-[auto_1fr] sm:gap-x-3">
              <dt className="font-medium text-foreground">State</dt>
              <dd data-testid="remote-status-state">{displayStateLabel}</dd>
              <dt className="font-medium text-foreground">Role</dt>
              <dd data-testid="remote-status-role">{displayRoleLabel}</dd>
              <dt className="font-medium text-foreground">Remote mode</dt>
              <dd data-testid="remote-status-link">
                {remoteStatus ? remoteStatus.connectionSummary : "Inactive"}
              </dd>
              {remoteStatus && (
                <>
                  <dt className="font-medium text-foreground">Participants</dt>
                  <dd data-testid="remote-status-participant-count">
                    {participantCountLabel}
                  </dd>
                </>
              )}
            </dl>
            <p
              className="mt-4 text-sm leading-6 text-foreground/66"
              data-testid="remote-status-description"
            >
              {displayDescription}
            </p>
          </div>
        </section>

        <DisclosureSection
          testId="remote-status-details"
          title="Connection details"
        >
          <dl className="grid gap-2 text-sm text-foreground/80 sm:grid-cols-[auto_1fr] sm:gap-x-3">
            <dt className="font-medium text-foreground">Network</dt>
            <dd data-testid="remote-status-network">{networkLabel}</dd>
            <dt className="font-medium text-foreground">Build</dt>
            <dd
              className="font-mono text-xs text-foreground/72"
              data-testid="remote-status-build"
              title={buildId}
            >
              {buildLabel}
            </dd>
            {remoteStatus && (
              <>
                <dt className="font-medium text-foreground">Session</dt>
                <dd data-testid="remote-status-session-role">
                  {compactRoleLabel}
                </dd>
                <dt className="font-medium text-foreground">Session id</dt>
                <dd
                  className="font-mono text-xs text-foreground/72"
                  data-testid="remote-status-session-id"
                >
                  {sessionId ?? "Unavailable"}
                </dd>
                <dt className="font-medium text-foreground">
                  Relay reachability
                </dt>
                <dd data-testid="remote-status-relay-reachability">
                  {relayReachabilityLabel}
                </dd>
                <dt className="font-medium text-foreground">Relay</dt>
                <dd data-testid="remote-status-relay">{relayLabel}</dd>
              </>
            )}
          </dl>
          {remoteStatus && (
            <div className="mt-4 space-y-3">
              <h4 className="text-xs font-medium uppercase tracking-[0.12em] text-foreground/58">
                Participants
              </h4>
              <ul
                className="space-y-2 rounded-2xl border border-foreground/10 bg-foreground/[0.04] px-3 py-3"
                data-testid="remote-status-connections"
              >
                {connectionDetails.length > 0 ? (
                  connectionDetails.map((detail) => (
                    <li
                      className="flex items-center justify-between gap-3 text-sm"
                      data-testid="remote-status-connection"
                      key={detail.id}
                    >
                      <span className="font-mono text-xs text-foreground/68">
                        {detail.id}
                      </span>
                      <span className="text-foreground/72">
                        {detail.isAlive ? "live" : "stale"}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-foreground/68">
                    No participants connected.
                  </li>
                )}
              </ul>
            </div>
          )}
        </DisclosureSection>

        {activityLog.length > 0 && (
          <DisclosureSection
            testId="remote-status-activity"
            title="Recent activity"
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
      {reportOverlay}
    </>
  )
}
