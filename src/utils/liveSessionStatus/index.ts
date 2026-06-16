import type { AppTranslationFn } from "@/i18n/translator"
import {
  getConnectionSummary,
  getDescription,
  getRoleLabel,
  getStateLabel,
} from "./copy.ts"

export type LiveSessionStatusRole = "control" | "readonly"
export type LiveSessionStatusState =
  | "connecting"
  | "connected"
  | "failed"
  | "recovered"
  | "reconnecting"

export type LiveSessionStatusModel = {
  canRetryManually: boolean
  connectionSummary: string
  description: string
  hasControllingParticipant?: boolean
  role: LiveSessionStatusRole
  roleLabel: string
  state: LiveSessionStatusState
  stateLabel: string
}

function getLiveSessionState({
  hasConnectedOnce,
  hasReceivedInitialSync,
  isRemoteEnabled,
  lifecycleState,
}: {
  hasConnectedOnce: boolean
  hasReceivedInitialSync: boolean
  isRemoteEnabled: boolean
  lifecycleState: LiveSessionStatusState
}) {
  if (lifecycleState === "failed" || lifecycleState === "recovered") {
    return lifecycleState
  }

  if (!isRemoteEnabled || !hasReceivedInitialSync) {
    return hasConnectedOnce ? "reconnecting" : "connecting"
  }

  if (lifecycleState === "reconnecting") {
    return "reconnecting"
  }

  return "connected"
}

export default function getLiveSessionStatus({
  canRetryManually,
  hasConnectedOnce,
  hasReceivedInitialSync,
  hasControllingParticipant,
  lifecycleState,
  participantCount,
  role,
  showPendingHostStatus = false,
  isRemoteEnabled,
  t,
}: {
  canRetryManually: boolean
  hasConnectedOnce: boolean
  hasReceivedInitialSync: boolean
  hasControllingParticipant?: boolean
  isRemoteEnabled: boolean
  lifecycleState: LiveSessionStatusState
  participantCount: number
  role: LiveSessionStatusRole
  showPendingHostStatus?: boolean
  t: AppTranslationFn
}): LiveSessionStatusModel | null {
  if (!isRemoteEnabled && !showPendingHostStatus) {
    return null
  }

  const controllingParticipantPresent = hasControllingParticipant ?? false
  const state = getLiveSessionState({
    hasConnectedOnce,
    hasReceivedInitialSync,
    isRemoteEnabled: Boolean(isRemoteEnabled || showPendingHostStatus),
    lifecycleState,
  })

  return {
    canRetryManually,
    connectionSummary: getConnectionSummary(
      {
        hasControllingParticipant: controllingParticipantPresent,
        hasReceivedInitialSync,
        participantCount,
        role,
        state,
      },
      t,
    ),
    description: getDescription(role, state, controllingParticipantPresent, t),
    hasControllingParticipant: controllingParticipantPresent,
    role,
    roleLabel: getRoleLabel(role, t),
    state,
    stateLabel: getStateLabel(state, t),
  }
}
