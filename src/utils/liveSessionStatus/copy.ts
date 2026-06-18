import type { AppTranslationFn } from "@/i18n/translator"
import type {
  LiveSessionStatusRole,
  LiveSessionStatusState,
} from "@/utils/liveSessionStatus"

export function getRoleLabel(
  role: LiveSessionStatusRole,
  t: AppTranslationFn,
): string {
  return t(`liveSessionStatus.roleLabels.${role}`)
}

export function getStateLabel(
  state: LiveSessionStatusState,
  t: AppTranslationFn,
): string {
  return t(`liveSessionStatus.stateLabels.${state}`)
}

export function getConnectionSummary(
  {
    hasControllingParticipant,
    hasReceivedInitialSync,
    participantCount,
    role,
    state,
  }: {
    hasControllingParticipant: boolean
    hasReceivedInitialSync: boolean
    participantCount: number
    role: LiveSessionStatusRole
    state: LiveSessionStatusState
  },
  t: AppTranslationFn,
): string {
  if (state === "connecting" || state === "reconnecting") {
    if (!hasReceivedInitialSync) {
      return t("liveSessionStatus.connectionSummary.waitingForSync")
    }

    return t("liveSessionStatus.connectionSummary.restoringRelay")
  }

  if (state === "failed") {
    return t("liveSessionStatus.connectionSummary.recoveryNeedsRetry")
  }

  const otherParticipantCount = Math.max(participantCount - 1, 0)

  if (role === "readonly") {
    if (!hasControllingParticipant) {
      return t("liveSessionStatus.connectionSummary.waitingForManager")
    }

    return otherParticipantCount > 0
      ? t("liveSessionStatus.connectionSummary.joinedWithOthers", {
          count: otherParticipantCount,
        })
      : t("liveSessionStatus.connectionSummary.joinedSharedTimer")
  }

  return otherParticipantCount > 0
    ? t("liveSessionStatus.connectionSummary.managingWithOthers", {
        count: otherParticipantCount,
      })
    : t("liveSessionStatus.connectionSummary.managingSharedTimer")
}

export function getDescription(
  role: LiveSessionStatusRole,
  state: LiveSessionStatusState,
  hasControllingParticipant: boolean,
  t: AppTranslationFn,
): string {
  if (state === "failed" || state === "recovered" || state === "reconnecting") {
    return t(`liveSessionStatus.descriptions.${state}`)
  }

  if (
    role === "readonly" &&
    state === "connected" &&
    !hasControllingParticipant
  ) {
    return t("liveSessionStatus.descriptions.readonly.connectedNoController")
  }

  return t(`liveSessionStatus.descriptions.${role}.${state}`)
}
