"use client"

import { useEffect, useId, useRef, useState } from "react"

import classNames from "classnames"

import type { PeerServerReachabilityState } from "@/utils/usePeerServerReachability"
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

function getRoleShortLabel(roleLabel: RemoteStatusModel["roleLabel"]) {
  switch (roleLabel) {
    case "Main host":
      return "Host"
    case "Control client":
      return "Control"
    case "Readonly client":
      return "Viewer"
  }
}

function getNetworkLabel(isOnline: boolean | null) {
  if (isOnline === null) {
    return "Checking"
  }
  return isOnline ? "Online" : "Offline"
}

function getPeerServerReachabilityLabel(
  peerServerReachability: PeerServerReachabilityState,
) {
  switch (peerServerReachability) {
    case "reachable":
      return "Reachable"
    case "unreachable":
      return "Unreachable"
    case "checking":
      return "Checking"
    case "managed":
      return "Managed by PeerJS cloud"
  }
}

function getCompactStatusAppearance({
  isOnline,
  peerServerReachability,
  state,
}: {
  isOnline: boolean | null
  peerServerReachability: PeerServerReachabilityState
  state: RemoteStatusModel["state"]
}) {
  if (isOnline === false || peerServerReachability === "unreachable") {
    return {
      icon: XCircleIcon,
      iconClassName: "text-red-300/90",
    }
  }

  if (state === "failed") {
    return {
      icon: XCircleIcon,
      iconClassName: "text-red-300/90",
    }
  }

  if (
    state === "degraded" ||
    state === "connecting" ||
    state === "reconnecting" ||
    peerServerReachability === "checking"
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

export default function RemoteStatus({
  connectionCount,
  connectionDetails,
  isOnline,
  isRetrying,
  onRetry,
  peerId,
  peerRole,
  peerServerLabel,
  peerServerReachability,
  peerStatus,
  remoteStatus,
}: {
  connectionCount: number
  connectionDetails: RemoteStatusConnection[]
  isOnline: boolean | null
  isRetrying: boolean
  onRetry: () => void
  peerId?: string
  peerRole: "main" | "client"
  peerServerLabel: string
  peerServerReachability: PeerServerReachabilityState
  peerStatus: "connected" | "disconnected"
  remoteStatus: RemoteStatusModel
}) {
  const [isPinnedOpen, setIsPinnedOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
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

  const networkLabel = getNetworkLabel(isOnline)
  const peerServerReachabilityLabel = getPeerServerReachabilityLabel(
    peerServerReachability,
  )
  const compactLabel = `${getRoleShortLabel(remoteStatus.roleLabel)} · ${remoteStatus.stateLabel}`
  const compactStatusAppearance = getCompactStatusAppearance({
    isOnline,
    peerServerReachability,
    state: remoteStatus.state,
  })
  const CompactStatusIcon = compactStatusAppearance.icon

  return (
    <section
      aria-atomic="true"
      aria-live="polite"
      className="absolute bottom-4 left-4 z-30"
      data-connection-count={connectionCount}
      data-peer-id={peerId ?? ""}
      data-peer-role={peerRole}
      data-peer-status={peerStatus}
      data-remote-role={remoteStatus.role}
      data-remote-state={remoteStatus.state}
      data-testid="remote-status"
      ref={containerRef}
      role="status"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        aria-controls={panelId}
        aria-expanded={isPanelOpen}
        aria-label={`Remote status: ${remoteStatus.roleLabel}, ${remoteStatus.stateLabel}`}
        className="flex items-center gap-2 rounded-full border border-foreground/8 bg-background/58 px-2.5 py-1.5 text-left text-foreground/72 shadow-md shadow-background/18 backdrop-blur transition hover:border-foreground/14 hover:bg-background/74 hover:text-foreground/88 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
        data-testid="remote-status-toggle"
        onClick={() => setIsPinnedOpen((current) => !current)}
        type="button"
      >
        <CompactStatusIcon
          className={classNames(
            "h-4 w-4 shrink-0",
            compactStatusAppearance.iconClassName,
          )}
        />
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-[0.94rem] font-semibold">
            <span>{compactLabel}</span>
          </span>
          <span className="block text-[0.72rem] text-foreground/54">
            {remoteStatus.connectionSummary}
          </span>
        </span>
        <ChevronUpDownIcon className="h-3.5 w-3.5 shrink-0 text-foreground/36" />
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
        <h2
          className="text-xs font-semibold uppercase tracking-[0.14em] text-primary/80"
          id={`${panelId}-heading`}
        >
          Remote status
        </h2>
        <dl className="mt-3 grid gap-2 text-sm text-foreground/80 sm:grid-cols-[auto_1fr] sm:gap-x-3">
          <dt className="font-medium text-foreground">Role</dt>
          <dd data-testid="remote-status-role">{remoteStatus.roleLabel}</dd>
          <dt className="font-medium text-foreground">State</dt>
          <dd data-testid="remote-status-state">{remoteStatus.stateLabel}</dd>
          <dt className="font-medium text-foreground">Link</dt>
          <dd data-testid="remote-status-link">
            {remoteStatus.connectionSummary}
          </dd>
          <dt className="font-medium text-foreground">Peer session</dt>
          <dd data-testid="remote-status-peer-role">
            {peerRole === "main" ? "Host peer" : "Joined peer"}
          </dd>
          <dt className="font-medium text-foreground">Network</dt>
          <dd data-testid="remote-status-network">{networkLabel}</dd>
          <dt className="font-medium text-foreground">Peer id</dt>
          <dd
            className="font-mono text-xs text-foreground/72"
            data-testid="remote-status-peer-id"
          >
            {peerId ?? "Unavailable"}
          </dd>
          <dt className="font-medium text-foreground">
            Peer server reachability
          </dt>
          <dd data-testid="remote-status-peer-reachability">
            {peerServerReachabilityLabel}
          </dd>
          <dt className="font-medium text-foreground">Peer server</dt>
          <dd data-testid="remote-status-peer-server">{peerServerLabel}</dd>
        </dl>
        <p
          className="mt-3 text-sm text-foreground/66"
          data-testid="remote-status-description"
        >
          {remoteStatus.description}
        </p>
        {remoteStatus.canRetryManually && (
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
        {connectionDetails.length > 0 && (
          <>
            <h3 className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-foreground/58">
              Peer links
            </h3>
            <ul
              className="mt-2 grid gap-1 text-xs text-foreground/72"
              data-testid="remote-status-connections"
            >
              {connectionDetails.map(({ id, isAlive }) => (
                <li
                  key={id}
                  data-connection-id={id}
                  data-connection-state={isAlive ? "alive" : "lost"}
                  data-testid="remote-status-connection"
                >{`${id.slice(-4)} (${isAlive ? "alive" : "lost"})`}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}
