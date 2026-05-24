"use client"

import classNames from "classnames"
import { useTranslations } from "next-intl"

import type { RemoteRelayReachabilityState } from "@/utils/remoteSession/useRemoteRelayReachability"
import type { SessionPresentationModel } from "@/utils/sessionPresentation"

import { getCompactStatusAppearance } from "./statusHelpers"

export default function StatusBadge({
  connectionCount,
  errorText,
  floatingTimerErrorText,
  isOnline,
  onOpenSharePanel,
  relayReachability,
  sessionPresentation,
  sessionId,
}: {
  connectionCount: number
  errorText: string | null
  floatingTimerErrorText: string | null
  isOnline: boolean | null
  onOpenSharePanel: () => void
  relayReachability: RemoteRelayReachabilityState
  sessionPresentation: SessionPresentationModel
  sessionId?: string
}) {
  const t = useTranslations("StatusBadge")
  const displayStateLabel = errorText
    ? t("error")
    : floatingTimerErrorText
      ? t("attentionNeeded")
      : sessionPresentation.runtimeBadgeLabel
  const compactStatusAppearance = getCompactStatusAppearance({
    errorText: errorText ?? floatingTimerErrorText,
    isOnline,
    isWaitingForController: sessionPresentation.isWaitingForController,
    relayReachability,
    state: sessionPresentation.state,
  })
  const CompactStatusIcon = compactStatusAppearance.icon

  return (
    <section
      aria-atomic="true"
      aria-live="polite"
      className="absolute bottom-4 left-4 z-20"
      data-connection-count={String(connectionCount)}
      data-remote-role={
        sessionPresentation.roleChipLabel?.toLowerCase() ?? "local"
      }
      data-remote-state={sessionPresentation.state}
      data-session-id={sessionId ?? ""}
      data-testid="remote-status"
      role="status"
    >
      <button
        aria-label={t("toggleLabel", {
          label: sessionPresentation.accessibilityLabel,
        })}
        className="
          flex cursor-pointer items-center gap-1.5 rounded-full border
          border-foreground/8 bg-background/58 px-2 py-1 text-left
          text-foreground/72 shadow-md shadow-background/18 backdrop-blur-sm
          transition
          hover:border-foreground/14 hover:bg-background/74
          hover:text-foreground/88
          focus:outline-2 focus:-outline-offset-2 focus:outline-primary
        "
        data-testid="remote-status-toggle"
        onClick={onOpenSharePanel}
        type="button"
      >
        <CompactStatusIcon
          className={classNames(
            "h-3.5 w-3.5 shrink-0",
            compactStatusAppearance.iconClassName,
          )}
        />
        <span
          className="
          flex min-w-0 items-center gap-1.5 text-[0.84rem] font-semibold
        "
        >
          <span className="truncate">{displayStateLabel}</span>
          {sessionPresentation.roleChipLabel && (
            <span
              className="
              rounded-full bg-foreground/8 px-1.5 py-0.5 text-[0.66rem]
              font-medium tracking-[0.08em] text-foreground/60 uppercase
            "
            >
              {sessionPresentation.roleChipLabel}
            </span>
          )}
        </span>
      </button>
    </section>
  )
}
