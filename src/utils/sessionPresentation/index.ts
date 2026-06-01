import type { RemoteRelayReachabilityState } from "@/utils/liveSession/useRemoteRelayReachability"
import type { LiveSessionStatusModel } from "@/utils/liveSessionStatus"
import type { AppTranslationFn } from "@/i18n/translator"

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
  isWaitingForController: boolean
  roleChipLabel: string | null
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

function getRoleChipLabel(
  remoteStatus: LiveSessionStatusModel | null,
  t: AppTranslationFn,
) {
  if (!remoteStatus) {
    return null
  }

  return remoteStatus.role === "control"
    ? t("TimerPage.sessionPresentation.control")
    : t("TimerPage.sessionPresentation.viewer")
}

function isWaitingForController(remoteStatus: LiveSessionStatusModel | null) {
  return (
    remoteStatus?.role === "readonly" &&
    remoteStatus.state === "connected" &&
    remoteStatus.hasControllingParticipant === false
  )
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
  remoteStatus: LiveSessionStatusModel | null
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

function getStatusPanelDescription(
  state: SessionPresentationState,
  t: AppTranslationFn,
) {
  switch (state) {
    case "local":
    case "liveEnded":
      return t("TimerPage.sessionPresentation.liveSessionOff")
    case "liveConnecting":
      return t("TimerPage.sessionPresentation.liveConnectingDescription")
    case "liveConnected":
      return t("TimerPage.sessionPresentation.liveConnectedDescription")
    case "liveReconnecting":
      return t("TimerPage.sessionPresentation.liveReconnectingDescription")
    case "liveConflict":
      return t("TimerPage.sessionPresentation.liveConflictDescription")
    case "liveOffline":
      return t("TimerPage.sessionPresentation.liveOfflineDescription")
  }
}

function getWaitingForControllerDescription(t: AppTranslationFn) {
  return t("TimerPage.sessionPresentation.waitingForControllerDescription")
}

function getStatusPanelStateLabel(
  state: SessionPresentationState,
  t: AppTranslationFn,
) {
  switch (state) {
    case "local":
      return t("TimerPage.sessionPresentation.statePrivate")
    case "liveConnecting":
      return t("TimerPage.sessionPresentation.stateConnecting")
    case "liveConnected":
      return t("TimerPage.sessionPresentation.stateConnected")
    case "liveReconnecting":
      return t("TimerPage.sessionPresentation.stateReconnecting")
    case "liveConflict":
      return t("TimerPage.sessionPresentation.stateError")
    case "liveOffline":
      return t("TimerPage.sessionPresentation.stateInterrupted")
    case "liveEnded":
      return t("TimerPage.sessionPresentation.statePrivate")
  }
}

function getStatusPanelSummaryLabel(
  state: SessionPresentationState,
  t: AppTranslationFn,
) {
  switch (state) {
    case "local":
      return t("TimerPage.sessionPresentation.summaryInactive")
    case "liveConnecting":
      return t("TimerPage.sessionPresentation.summaryPreparingLinks")
    case "liveConnected":
      return t("TimerPage.sessionPresentation.summarySynchronized")
    case "liveReconnecting":
      return t("TimerPage.sessionPresentation.summaryRestoring")
    case "liveConflict":
      return t("TimerPage.sessionPresentation.stateError")
    case "liveOffline":
      return t("TimerPage.sessionPresentation.summaryReconnectInProgress")
    case "liveEnded":
      return t("TimerPage.sessionPresentation.summaryInactive")
  }
}

function getSharePanelCopy({
  isWaitingForController,
  state,
  isReadonlyParticipant,
  t,
}: {
  isWaitingForController: boolean
  state: SessionPresentationState
  isReadonlyParticipant: boolean
  t: AppTranslationFn
}) {
  const endActionLabel = isReadonlyParticipant
    ? t("TimerPage.sessionPresentation.leaveLiveSession")
    : t("TimerPage.sessionPresentation.endLiveSession")

  switch (state) {
    case "local":
      return {
        bullets: [
          t("TimerPage.sessionPresentation.liveUpdates"),
          t("TimerPage.sessionPresentation.viewerAndControlLinks"),
          t("TimerPage.sessionPresentation.automaticReconnectSupport"),
        ],
        description: t("TimerPage.sessionPresentation.syncAcrossDevices"),
        endActionLabel,
        primaryActionLabel: t("TimerPage.sessionPresentation.startLiveSession"),
        showLinks: false,
        showRetry: false,
        statusLabel: null,
        tone: "neutral" as const,
      }
    case "liveConnecting":
      return {
        bullets: [
          t("TimerPage.sessionPresentation.preparingSeparateLinks"),
          t("TimerPage.sessionPresentation.switchingToControlLink"),
        ],
        description: t(
          "TimerPage.sessionPresentation.liveConnectingDescription",
        ),
        endActionLabel,
        primaryActionLabel: t(
          "TimerPage.sessionPresentation.startingLiveSession",
        ),
        showLinks: false,
        showRetry: false,
        statusLabel: t("TimerPage.sessionPresentation.startingLiveSession"),
        tone: "neutral" as const,
      }
    case "liveConnected":
      return {
        bullets: [],
        description: isWaitingForController
          ? getWaitingForControllerDescription(t)
          : t("TimerPage.sessionPresentation.shareViewerOrControl"),
        endActionLabel,
        primaryActionLabel: null,
        showLinks: true,
        showRetry: false,
        statusLabel: isWaitingForController
          ? t("TimerPage.sessionPresentation.waitingForController")
          : t("TimerPage.sessionPresentation.connectedAndSynchronized"),
        tone: isWaitingForController
          ? ("warning" as const)
          : ("success" as const),
      }
    case "liveReconnecting":
      return {
        bullets: [
          t("TimerPage.sessionPresentation.localTimerUsable"),
          t("TimerPage.sessionPresentation.changesSyncAfterReconnect"),
        ],
        description: t("TimerPage.sessionPresentation.tryingToReconnect"),
        endActionLabel,
        primaryActionLabel: null,
        showLinks: true,
        showRetry: true,
        statusLabel: t("TimerPage.sessionPresentation.stateInterrupted"),
        tone: "warning" as const,
      }
    case "liveConflict":
      return {
        bullets: [
          t("TimerPage.sessionPresentation.conflictHandlingReviewDialog"),
          t("TimerPage.sessionPresentation.viewerAndControlStayAvailable"),
        ],
        description: t(
          "TimerPage.sessionPresentation.reviewBeforeSyncContinues",
        ),
        endActionLabel,
        primaryActionLabel: null,
        showLinks: true,
        showRetry: false,
        statusLabel: t("TimerPage.sessionPresentation.stateError"),
        tone: "warning" as const,
      }
    case "liveOffline":
      return {
        bullets: [
          t("TimerPage.sessionPresentation.localTimerUsable"),
          t("TimerPage.sessionPresentation.changesSyncAfterReconnect"),
        ],
        description: t("TimerPage.sessionPresentation.connectionInterrupted"),
        endActionLabel,
        primaryActionLabel: null,
        showLinks: true,
        showRetry: true,
        statusLabel: t("TimerPage.sessionPresentation.stateInterrupted"),
        tone: "warning" as const,
      }
    case "liveEnded":
      return {
        bullets: [
          t("TimerPage.sessionPresentation.liveUpdates"),
          t("TimerPage.sessionPresentation.viewerAndControlLinks"),
          t("TimerPage.sessionPresentation.automaticReconnectSupport"),
        ],
        description: t("TimerPage.sessionPresentation.syncAcrossDevices"),
        endActionLabel,
        primaryActionLabel: t("TimerPage.sessionPresentation.startLiveSession"),
        showLinks: false,
        showRetry: false,
        statusLabel: null,
        tone: "neutral" as const,
      }
  }
}

export default function getSessionPresentation({
  hasPendingSyncConflict,
  hasRecentlyEndedSession,
  isOnline,
  relayReachability,
  remoteStatus,
  t,
}: {
  hasPendingSyncConflict: boolean
  hasRecentlyEndedSession: boolean
  isOnline: boolean | null
  relayReachability: RemoteRelayReachabilityState
  remoteStatus: LiveSessionStatusModel | null
  t: AppTranslationFn
}): SessionPresentationModel {
  const state = getSessionState({
    hasPendingSyncConflict,
    hasRecentlyEndedSession,
    isOnline,
    relayReachability,
    remoteStatus,
  })
  const waitingForController = isWaitingForController(remoteStatus)
  const roleChipLabel = getRoleChipLabel(remoteStatus, t)
  const stateLabel = getStatusPanelStateLabel(state, t)
  let sessionLabel = t("TimerPage.sessionPresentation.liveSession")
  if (state === "local" || state === "liveEnded") {
    sessionLabel = t("TimerPage.sessionPresentation.privateSession")
  }

  let accessLabel = t("TimerPage.sessionPresentation.controlAccess")
  if (state === "local" || state === "liveEnded") {
    accessLabel = t("TimerPage.sessionPresentation.privateAccess")
  } else if (remoteStatus?.role === "readonly") {
    accessLabel = t("TimerPage.sessionPresentation.viewerAccess")
  }

  let runtimeBadgeLabel = stateLabel.replace("...", "")
  if (state === "liveConnected") {
    runtimeBadgeLabel = waitingForController
      ? t("TimerPage.sessionPresentation.waiting")
      : t("TimerPage.sessionPresentation.stateConnected")
  } else if (state === "liveEnded") {
    runtimeBadgeLabel = t("TimerPage.sessionPresentation.statePrivate")
  }
  let sidebarStatus: SessionPresentationModel["sidebarStatus"] = {
    eyebrow: t("TimerPage.sessionPresentation.liveSessionEyebrow"),
    label: t("TimerPage.sessionPresentation.privateSession"),
  }
  switch (state) {
    case "local":
    case "liveEnded":
      sidebarStatus = {
        eyebrow: t("TimerPage.sessionPresentation.localEyebrow"),
        label: t("TimerPage.sessionPresentation.privateSession"),
      }
      break
    case "liveConnected":
      sidebarStatus = {
        eyebrow: t("TimerPage.sessionPresentation.liveSessionEyebrow"),
        label: waitingForController
          ? t("TimerPage.sessionPresentation.waitingForController")
          : t("TimerPage.sessionPresentation.summarySynchronized"),
      }
      break
    case "liveConnecting":
      sidebarStatus = {
        eyebrow: t("TimerPage.sessionPresentation.liveSessionEyebrow"),
        label: t("TimerPage.sessionPresentation.stateConnecting"),
      }
      break
    case "liveReconnecting":
      sidebarStatus = {
        eyebrow: t("TimerPage.sessionPresentation.liveSessionEyebrow"),
        label: t("TimerPage.sessionPresentation.stateReconnecting"),
      }
      break
    case "liveConflict":
      sidebarStatus = {
        eyebrow: t("TimerPage.sessionPresentation.liveSessionEyebrow"),
        label: t("TimerPage.sessionPresentation.stateError"),
      }
      break
    case "liveOffline":
      sidebarStatus = {
        eyebrow: t("TimerPage.sessionPresentation.liveSessionEyebrow"),
        label: t("TimerPage.sessionPresentation.stateInterrupted"),
      }
      break
  }
  const sharePanel = getSharePanelCopy({
    isWaitingForController: waitingForController,
    state,
    isReadonlyParticipant: remoteStatus?.role === "readonly",
    t,
  })

  return {
    accessibilityLabel: [
      sessionLabel,
      waitingForController
        ? t("TimerPage.sessionPresentation.waitingForController")
        : stateLabel,
      roleChipLabel
        ? t("TimerPage.sessionPresentation.roleAccess", {
            role: roleChipLabel,
          })
        : null,
    ]
      .filter(Boolean)
      .join(", "),
    isWaitingForController: waitingForController,
    roleChipLabel,
    runtimeBadgeLabel,
    sharePanel,
    sidebarStatus,
    state,
    statusPanel: {
      accessLabel,
      description: waitingForController
        ? getWaitingForControllerDescription(t)
        : getStatusPanelDescription(state, t),
      sessionLabel,
      stateLabel: waitingForController
        ? t("TimerPage.sessionPresentation.waitingForController")
        : stateLabel,
      summaryLabel: waitingForController
        ? t("TimerPage.sessionPresentation.waitingForController")
        : getStatusPanelSummaryLabel(state, t),
    },
  }
}
