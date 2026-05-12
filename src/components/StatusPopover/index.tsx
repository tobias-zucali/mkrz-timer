"use client"

import { useEffect, useId, useRef, useState } from "react"

import classNames from "classnames"

import CloseButton from "@/components/CloseButton"
import { getDocumentLocale } from "@/i18n/locale"
import useClipboardCopy from "@/utils/useClipboardCopy"
import type { RemoteRelayReachabilityState } from "@/utils/remoteSession/useRemoteRelayReachability"
import type { RemoteStatusModel } from "@/utils/remoteStatus"

type RemoteStatusConnection = {
  id: string
  isAlive: boolean
}

function ChevronUpDownIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="m4.5 9 7.5-7.5L19.5 9m-15 6 7.5 7.5 7.5-7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 12.75 11.25 15 15 9.75m6 2.25a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374L10.052 3.374c.866-1.5 3.03-1.5 3.896 0l7.355 12.752ZM12 16.5h.008v.008H12V16.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="m14.74 9.26-5.48 5.48m0-5.48 5.48 5.48M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function getCompactBadgeLabel(remoteStatus: RemoteStatusModel | null) {
  if (!remoteStatus) {
    return "Local"
  }

  return remoteStatus.role === "control" ? "Control" : "Viewer"
}

function getNetworkLabel(isOnline: boolean | null) {
  if (isOnline === null) {
    return "Checking"
  }
  return isOnline ? "Online" : "Offline"
}

function getRelayReachabilityLabel(
  relayReachability: RemoteRelayReachabilityState,
) {
  switch (relayReachability) {
    case "reachable":
      return "Reachable"
    case "unreachable":
      return "Unreachable"
    case "checking":
      return "Checking"
  }
}

function getCompactStatusAppearance({
  errorText,
  hasRemoteStatus,
  isOnline,
  relayReachability,
  state,
}: {
  errorText: string | null
  hasRemoteStatus: boolean
  isOnline: boolean | null
  relayReachability: RemoteRelayReachabilityState
  state: RemoteStatusModel["state"]
}) {
  if (!hasRemoteStatus && !errorText) {
    return {
      icon: CheckCircleIcon,
      iconClassName: "text-emerald-400/90",
    }
  }

  if (errorText || isOnline === false) {
    return {
      icon: XCircleIcon,
      iconClassName: "text-red-300/90",
    }
  }

  if (state === "connected" || state === "recovered") {
    return {
      icon: CheckCircleIcon,
      iconClassName: "text-emerald-400/90",
    }
  }

  if (
    state === "failed" ||
    state === "connecting" ||
    state === "reconnecting" ||
    relayReachability === "unreachable" ||
    relayReachability === "checking"
  ) {
    return {
      icon: ExclamationTriangleIcon,
      iconClassName: "text-amber-300/90",
    }
  }

  return {
    icon: CheckCircleIcon,
    iconClassName: "text-emerald-400/90",
  }
}

function splitTimelineEntry(entry: string) {
  const separatorIndex = entry.indexOf(" ")
  if (separatorIndex < 0) {
    return {
      detail: entry,
      timestamp: "",
    }
  }

  return {
    detail: entry.slice(separatorIndex + 1),
    timestamp: entry.slice(0, separatorIndex),
  }
}

function formatRelativeTimestamp(
  timestamp: string,
  now: number,
  locale: string,
) {
  const parsedTime = Date.parse(timestamp)
  if (Number.isNaN(parsedTime)) {
    return timestamp
  }

  const diffSeconds = Math.round((parsedTime - now) / 1000)
  const absoluteDiffSeconds = Math.abs(diffSeconds)
  const relativeTimeFormatter = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
  })

  if (absoluteDiffSeconds < 45) {
    return relativeTimeFormatter.format(0, "second")
  }

  if (absoluteDiffSeconds < 60 * 45) {
    return relativeTimeFormatter.format(Math.round(diffSeconds / 60), "minute")
  }

  if (absoluteDiffSeconds < 60 * 60 * 22) {
    return relativeTimeFormatter.format(Math.round(diffSeconds / 3600), "hour")
  }

  return relativeTimeFormatter.format(
    Math.round(diffSeconds / (3600 * 24)),
    "day",
  )
}

export default function StatusPopover({
  activityLog,
  connectionCount,
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
  connectionCount: number
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
  const [isPinnedOpen, setIsPinnedOpen] = useState(false)
  const [isReportOverlayOpen, setIsReportOverlayOpen] = useState(false)
  const [reportComment, setReportComment] = useState("")
  const [isHovered, setIsHovered] = useState(false)
  const [locale] = useState(() => getDocumentLocale())
  const [relativeNow, setRelativeNow] = useState(() => Date.now())
  const { canCopy, copyText, isCopied } = useClipboardCopy()
  const containerRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const isPanelOpen = isPinnedOpen || isHovered

  useEffect(() => {
    if (!isPinnedOpen) {
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsPinnedOpen(false)
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPinnedOpen(false)
      }
    }

    window.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("keyup", onKeyUp)

    return () => {
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [isPinnedOpen])

  useEffect(() => {
    if (errorText || floatingTimerErrorText) {
      setIsPinnedOpen(true)
    }
  }, [errorText, floatingTimerErrorText])

  useEffect(() => {
    if (!isPanelOpen) {
      return
    }

    setRelativeNow(Date.now())

    const intervalId = window.setInterval(() => {
      setRelativeNow(Date.now())
    }, 30_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isPanelOpen])

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
      : "Remote mode is off. Open settings when you want to share the timer."
  const compactRoleLabel = getCompactBadgeLabel(remoteStatus)
  const compactStatusAppearance = getCompactStatusAppearance({
    errorText: errorText ?? floatingTimerErrorText,
    hasRemoteStatus: Boolean(remoteStatus),
    isOnline,
    relayReachability,
    state: remoteStatus?.state ?? "connected",
  })
  const trimmedReportComment = reportComment.trim()
  const reportBody = getErrorReportBody()
  const mailBody = [
    "User comment:",
    trimmedReportComment || "No additional comment provided.",
    "",
    reportBody,
  ].join("\n")
  const CompactStatusIcon = compactStatusAppearance.icon

  const openMailApp = () => {
    window.location.href = `mailto:timer@mkrz.at?subject=Status%20Report&body=${encodeURIComponent(mailBody)}`
  }

  return (
    <>
      <section
        aria-atomic="true"
        aria-live="polite"
        className="absolute bottom-4 left-4 z-50"
        data-connection-count={connectionCount}
        data-remote-role={remoteStatus?.role ?? "inactive"}
        data-remote-state={remoteStatus?.state ?? "inactive"}
        data-session-id={sessionId ?? ""}
        data-testid="remote-status"
        ref={containerRef}
        role="status"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          aria-controls={panelId}
          aria-expanded={isPanelOpen}
          aria-label={`Status: ${displayRoleLabel}, ${displayStateLabel}`}
          aria-pressed={isPinnedOpen}
          className="flex items-center gap-1.5 rounded-full border border-foreground/8 bg-background/58 px-2 py-1 text-left text-foreground/72 shadow-md shadow-background/18 backdrop-blur transition hover:border-foreground/14 hover:bg-background/74 hover:text-foreground/88 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
          data-testid="remote-status-toggle"
          onClick={() => setIsPinnedOpen((current) => !current)}
          type="button"
        >
          <CompactStatusIcon
            className={classNames(
              "h-3.5 w-3.5 shrink-0",
              compactStatusAppearance.iconClassName,
            )}
          />
          <span className="flex min-w-0 items-center gap-1.5 text-[0.84rem] font-semibold">
            <span className="truncate">{displayStateLabel}</span>
            {compactRoleLabel && (
              <span className="rounded-full bg-foreground/8 px-1.5 py-0.5 text-[0.66rem] font-medium uppercase tracking-[0.08em] text-foreground/60">
                {compactRoleLabel}
              </span>
            )}
          </span>
          <ChevronUpDownIcon className="h-3 w-3 shrink-0 text-foreground/36" />
        </button>

        <div
          className={classNames(
            "absolute bottom-full left-0 mb-2 w-[min(22rem,calc(100vw-2rem))] origin-bottom-left rounded-2xl border border-foreground/12 bg-background/95 p-4 shadow-2xl shadow-background/35 ring-1 ring-foreground/6 backdrop-blur transition",
            isPanelOpen
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-1 opacity-0",
          )}
          data-testid="remote-status-panel"
          hidden={!isPanelOpen}
          id={panelId}
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2
              className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/80"
              id={`${panelId}-heading`}
            >
              Status
            </h2>
            <button
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-foreground/12 bg-foreground/[0.06] px-3 py-1.5 text-xs font-semibold text-foreground/78 transition hover:border-foreground/18 hover:bg-foreground/[0.1] hover:text-foreground focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
              onClick={() => setIsReportOverlayOpen(true)}
              type="button"
            >
              Send to developer
            </button>
          </div>
          {errorText && (
            <div
              className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-sm text-red-100"
              data-testid="remote-status-error"
              role="alert"
            >
              <p className="font-semibold text-red-50">Latest issue</p>
              <p className="mt-1 leading-6">{errorText}</p>
            </div>
          )}
          {floatingTimerErrorText && (
            <div
              className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100"
              data-testid="status-floating-timer-error"
              role="alert"
            >
              <p className="font-semibold text-amber-50">
                Floating timer issue
              </p>
              <p className="mt-1 leading-6">{floatingTimerErrorText}</p>
            </div>
          )}
          <dl className="mt-3 grid gap-2 text-sm text-foreground/80 sm:grid-cols-[auto_1fr] sm:gap-x-3">
            <dt className="font-medium text-foreground">Mode</dt>
            <dd data-testid="remote-status-role">{displayRoleLabel}</dd>
            <dt className="font-medium text-foreground">State</dt>
            <dd data-testid="remote-status-state">{displayStateLabel}</dd>
            <dt className="font-medium text-foreground">Remote mode</dt>
            <dd data-testid="remote-status-link">
              {remoteStatus ? remoteStatus.connectionSummary : "Inactive"}
            </dd>
            <dt className="font-medium text-foreground">Network</dt>
            <dd data-testid="remote-status-network">{networkLabel}</dd>
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
          <p
            className="mt-3 text-sm text-foreground/66"
            data-testid="remote-status-description"
          >
            {displayDescription}
          </p>
          {remoteStatus?.canRetryManually && (
            <button
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:bg-foreground/90 focus:outline-2 focus:-outline-offset-2 focus:outline-primary disabled:cursor-default disabled:opacity-60"
              data-testid="remote-status-retry"
              disabled={isRetrying}
              type="button"
              onClick={onRetry}
            >
              {isRetrying ? "Retrying..." : "Retry connection"}
            </button>
          )}
          {remoteStatus && connectionDetails.length > 0 && (
            <>
              <h3 className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-foreground/58">
                Participants
              </h3>
              <ul
                className="mt-2 space-y-2 rounded-2xl border border-foreground/10 bg-foreground/[0.04] px-3 py-3"
                data-testid="remote-status-connections"
              >
                {connectionDetails.map((detail) => (
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
                ))}
              </ul>
            </>
          )}
          {(activityLog.length > 0 || errorText) && (
            <>
              <h3 className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-foreground/58">
                Activity
              </h3>
              <ul
                className="mt-2 space-y-2 rounded-2xl border border-foreground/10 bg-foreground/[0.04] px-3 py-3"
                data-testid="remote-status-activity-log"
              >
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
                        {formatRelativeTimestamp(
                          timestamp,
                          relativeNow,
                          locale,
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </section>

      {isReportOverlayOpen && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/70 px-4 py-6 backdrop-blur"
          role="dialog"
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
                value={reportComment}
              />
            </label>
            <div className="mt-5 space-y-3">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:bg-foreground/90 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                onClick={openMailApp}
                type="button"
              >
                Open mail app
              </button>
              {canCopy && (
                <button
                  className="ml-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-foreground/12 bg-foreground/[0.04] px-4 py-2 text-sm font-semibold text-foreground transition hover:border-foreground/18 hover:bg-foreground/[0.08] focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
                  onClick={() => copyText(mailBody)}
                  type="button"
                >
                  {isCopied ? "Copied" : "Copy report"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
