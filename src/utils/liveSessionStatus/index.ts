import {
  getConnectionSummary,
  getDescription,
  ROLE_LABELS,
  STATE_LABELS,
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
}): LiveSessionStatusModel | null {
  if (!isRemoteEnabled && !showPendingHostStatus) {
    return null
  }

  const roleLabel = ROLE_LABELS[role]
  const controllingParticipantPresent = hasControllingParticipant ?? false
  const state = getLiveSessionState({
    hasConnectedOnce,
    hasReceivedInitialSync,
    isRemoteEnabled: Boolean(isRemoteEnabled || showPendingHostStatus),
    lifecycleState,
  })

  return {
    canRetryManually,
    connectionSummary: getConnectionSummary({
      hasControllingParticipant: controllingParticipantPresent,
      hasReceivedInitialSync,
      participantCount,
      role,
      state,
    }),
    description: getDescription(role, state, controllingParticipantPresent),
    hasControllingParticipant: controllingParticipantPresent,
    role,
    roleLabel,
    state,
    stateLabel: STATE_LABELS[state],
  }
}
