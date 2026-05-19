import type { RemoteRelayReachabilityState } from "@/utils/remoteSession/useRemoteRelayReachability"
import type { RemoteStatusModel } from "@/utils/remoteStatus"

export type SessionPresentationState =
  | "local"
  | "liveConnecting"
  | "liveConnected"
  | "liveReconnecting"
  | "liveConflict"
  | "liveOffline"
  | "liveEnded"

type SessionPresentationTone = "neutral" | "success" | "warning"

export type SessionPresentationModel = {
  accessibilityLabel: string
  roleChipLabel: "CONTROL" | "VIEWER" | null
  runtimeBadgeLabel: string
  sharePanel: {
    bullets: string[]
    description: string
    endActionLabel: string
    primaryActionLabel: string | null
    showLinks: boolean
    showRetry: boolean
    statusLabel: string | null
    tone: SessionPresentationTone
  }
  sidebarStatus: {
    eyebrow: string
    label: string
  }
  state: SessionPresentationState
  statusPanel: {
    accessLabel: string
    description: string
    sessionLabel: string
    stateLabel: string
    summaryLabel: string
  }
}

function getRoleChipLabel(remoteStatus: RemoteStatusModel | null) {
  if (!remoteStatus) {
    return null
  }

  return remoteStatus.role === "control" ? "CONTROL" : "VIEWER"
}

function getSessionState({
  hasPendingSyncConflict,
  hasRecentlyEndedSession,
  isOnline,
  relayReachability,
  remoteStatus,
}: {
  hasPendingSyncConflict: boolean
  hasRecentlyEndedSession: boolean
  isOnline: boolean | null
  relayReachability: RemoteRelayReachabilityState
  remoteStatus: RemoteStatusModel | null
}): SessionPresentationState {
  if (hasPendingSyncConflict || remoteStatus?.state === "failed") {
    return "liveConflict"
  }

  if (!remoteStatus) {
    return hasRecentlyEndedSession ? "liveEnded" : "local"
  }

  if (isOnline === false) {
    return "liveOffline"
  }

  if (remoteStatus.state === "connecting") {
    if (relayReachability === "unreachable") {
      return "liveOffline"
    }
    return "liveConnecting"
  }

  if (remoteStatus.state === "reconnecting") {
    if (relayReachability === "unreachable") {
      return "liveOffline"
    }
    return "liveReconnecting"
  }

  return "liveConnected"
}

function getStatusPanelDescription(state: SessionPresentationState) {
  switch (state) {
    case "local":
    case "liveEnded":
      return "Live session is off. Open Share when you want to sync this timer across devices."
    case "liveConnecting":
      return "Starting live synchronization and preparing separate viewer and control links."
    case "liveConnected":
      return "This timer is synchronized through a live session."
    case "liveReconnecting":
      return "Trying to restore live synchronization. Local changes will sync again after reconnect."
    case "liveConflict":
      return "Review is needed before live synchronization can continue."
    case "liveOffline":
      return "Connection is interrupted. Local changes stay usable and will sync again after reconnect."
  }
}

function getStatusPanelStateLabel(state: SessionPresentationState) {
  switch (state) {
    case "local":
      return "Private"
    case "liveConnecting":
      return "Connecting..."
    case "liveConnected":
      return "Connected"
    case "liveReconnecting":
      return "Reconnecting..."
    case "liveConflict":
      return "Error"
    case "liveOffline":
      return "Connection interrupted"
    case "liveEnded":
      return "Private"
  }
}

function getStatusPanelSummaryLabel(state: SessionPresentationState) {
  switch (state) {
    case "local":
      return "Inactive"
    case "liveConnecting":
      return "Preparing viewer and control links"
    case "liveConnected":
      return "Synchronized"
    case "liveReconnecting":
      return "Restoring synchronization"
    case "liveConflict":
      return "Error"
    case "liveOffline":
      return "Reconnect in progress"
    case "liveEnded":
      return "Inactive"
  }
}

function getSharePanelCopy({
  state,
  isReadonlyParticipant,
}: {
  state: SessionPresentationState
  isReadonlyParticipant: boolean
}) {
  const endActionLabel = isReadonlyParticipant
    ? "Leave live session"
    : "End live session"

  switch (state) {
    case "local":
      return {
        bullets: [
          "Live updates",
          "Viewer and control links",
          "Automatic reconnect support",
        ],
        description: "Synchronize this timer across multiple devices.",
        endActionLabel,
        primaryActionLabel: "Start live session",
        showLinks: false,
        showRetry: false,
        statusLabel: null,
        tone: "neutral" as const,
      }
    case "liveConnecting":
      return {
        bullets: [
          "Preparing separate viewer and control links",
          "Keeping this timer on its local URL",
        ],
        description: "Starting live synchronization and preparing share links.",
        endActionLabel,
        primaryActionLabel: "Starting live session...",
        showLinks: false,
        showRetry: false,
        statusLabel: "Starting live session...",
        tone: "neutral" as const,
      }
    case "liveConnected":
      return {
        bullets: [],
        description:
          "Share a viewer link for audience screens or a control link for full timer and settings access.",
        endActionLabel,
        primaryActionLabel: null,
        showLinks: true,
        showRetry: false,
        statusLabel: "Connected and synchronized",
        tone: "success" as const,
      }
    case "liveReconnecting":
      return {
        bullets: [
          "Local timer remains usable",
          "Changes will synchronize after reconnect",
        ],
        description: "Trying to reconnect to the live session.",
        endActionLabel,
        primaryActionLabel: null,
        showLinks: true,
        showRetry: true,
        statusLabel: "Connection interrupted",
        tone: "warning" as const,
      }
    case "liveConflict":
      return {
        bullets: [
          "Conflict handling continues in the review dialog",
          "Viewer and control links stay available",
        ],
        description: "Review the session before synchronization continues.",
        endActionLabel,
        primaryActionLabel: null,
        showLinks: true,
        showRetry: false,
        statusLabel: "Error",
        tone: "warning" as const,
      }
    case "liveOffline":
      return {
        bullets: [
          "Local timer remains usable",
          "Changes will synchronize after reconnect",
        ],
        description: "Connection to the live session is interrupted.",
        endActionLabel,
        primaryActionLabel: null,
        showLinks: true,
        showRetry: true,
        statusLabel: "Connection interrupted",
        tone: "warning" as const,
      }
    case "liveEnded":
      return {
        bullets: [
          "Live updates",
          "Viewer and control links",
          "Automatic reconnect support",
        ],
        description: "Synchronize this timer across multiple devices.",
        endActionLabel,
        primaryActionLabel: "Start live session",
        showLinks: false,
        showRetry: false,
        statusLabel: null,
        tone: "neutral" as const,
      }
  }
}

export function getLocalShareDescription() {
  return "Open this timer setup independently. No live synchronization. Changes are independent after opening."
}

export default function getSessionPresentation({
  hasPendingSyncConflict,
  hasRecentlyEndedSession,
  isOnline,
  relayReachability,
  remoteStatus,
}: {
  hasPendingSyncConflict: boolean
  hasRecentlyEndedSession: boolean
  isOnline: boolean | null
  relayReachability: RemoteRelayReachabilityState
  remoteStatus: RemoteStatusModel | null
}): SessionPresentationModel {
  const state = getSessionState({
    hasPendingSyncConflict,
    hasRecentlyEndedSession,
    isOnline,
    relayReachability,
    remoteStatus,
  })
  const roleChipLabel = getRoleChipLabel(remoteStatus)
  const stateLabel = getStatusPanelStateLabel(state)
  let sessionLabel = "Live session"
  if (state === "local" || state === "liveEnded") {
    sessionLabel = "Private session"
  }

  let accessLabel = "Control access"
  if (state === "local" || state === "liveEnded") {
    accessLabel = "Private"
  } else if (remoteStatus?.role === "readonly") {
    accessLabel = "Viewer access"
  }

  let runtimeBadgeLabel = stateLabel.replace("...", "")
  if (state === "liveConnected") {
    runtimeBadgeLabel = "Connected"
  } else if (state === "liveEnded") {
    runtimeBadgeLabel = "Private"
  }

  let sidebarStatus: SessionPresentationModel["sidebarStatus"] = {
    eyebrow: "LIVE SESSION",
    label: "Private session",
  }
  switch (state) {
    case "local":
    case "liveEnded":
      sidebarStatus = {
        eyebrow: "LOCAL",
        label: "Private session",
      }
      break
    case "liveConnected":
      sidebarStatus = {
        eyebrow: "LIVE SESSION",
        label: "Synchronized",
      }
      break
    case "liveConnecting":
      sidebarStatus = {
        eyebrow: "LIVE SESSION",
        label: "Connecting...",
      }
      break
    case "liveReconnecting":
      sidebarStatus = {
        eyebrow: "LIVE SESSION",
        label: "Reconnecting...",
      }
      break
    case "liveConflict":
      sidebarStatus = {
        eyebrow: "LIVE SESSION",
        label: "Error",
      }
      break
    case "liveOffline":
      sidebarStatus = {
        eyebrow: "LIVE SESSION",
        label: "Connection interrupted",
      }
      break
  }
  const sharePanel = getSharePanelCopy({
    state,
    isReadonlyParticipant: remoteStatus?.role === "readonly",
  })

  return {
    accessibilityLabel: [
      sessionLabel,
      stateLabel,
      roleChipLabel ? `${roleChipLabel} access` : null,
    ]
      .filter(Boolean)
      .join(", "),
    roleChipLabel,
    runtimeBadgeLabel,
    sharePanel,
    sidebarStatus,
    state,
    statusPanel: {
      accessLabel,
      description: getStatusPanelDescription(state),
      sessionLabel,
      stateLabel,
      summaryLabel: getStatusPanelSummaryLabel(state),
    },
  }
}
