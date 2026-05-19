"use client"

import classNames from "classnames"

import type { RemoteRelayReachabilityState } from "@/utils/remoteSession/useRemoteRelayReachability"
import type { RemoteStatusModel } from "@/utils/remoteStatus"

import {
  getCompactBadgeLabel,
  getCompactStatusAppearance,
} from "./statusHelpers"

export default function StatusBadge({
  connectionCount,
  errorText,
  floatingTimerErrorText,
  isOnline,
  onOpenStatusPanel,
  relayReachability,
  remoteRole,
  remoteStatus,
  sessionId,
}: {
  connectionCount: number
  errorText: string | null
  floatingTimerErrorText: string | null
  isOnline: boolean | null
  onOpenStatusPanel: () => void
  relayReachability: RemoteRelayReachabilityState
  remoteRole: "control" | "readonly"
  remoteStatus: RemoteStatusModel | null
  sessionId?: string
}) {
  const displayRoleLabel = remoteStatus?.roleLabel ?? "Local timer"
  const displayStateLabel = errorText
    ? (remoteStatus?.stateLabel ?? "Attention needed")
    : floatingTimerErrorText
      ? "Attention needed"
      : (remoteStatus?.stateLabel ?? "Ready")
  const compactRoleLabel = getCompactBadgeLabel(remoteStatus)
  const compactStatusAppearance = getCompactStatusAppearance({
    errorText: errorText ?? floatingTimerErrorText,
    hasRemoteStatus: Boolean(remoteStatus),
    isOnline,
    relayReachability,
    state: remoteStatus?.state ?? "connected",
  })
  const CompactStatusIcon = compactStatusAppearance.icon

  return (
    <section
      aria-atomic="true"
      aria-live="polite"
      className="absolute bottom-4 left-4 z-20"
      data-connection-count={String(connectionCount)}
      data-remote-role={remoteStatus ? remoteRole : "local"}
      data-remote-state={remoteStatus?.state ?? "local"}
      data-session-id={sessionId ?? ""}
      data-testid="remote-status"
      role="status"
    >
      <button
        aria-label={`Status: ${displayRoleLabel}, ${displayStateLabel}`}
        className="flex cursor-pointer items-center gap-1.5 rounded-full border border-foreground/8 bg-background/58 px-2 py-1 text-left text-foreground/72 shadow-md shadow-background/18 backdrop-blur transition hover:border-foreground/14 hover:bg-background/74 hover:text-foreground/88 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
        data-testid="remote-status-toggle"
        onClick={onOpenStatusPanel}
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
      </button>
    </section>
  )
}
