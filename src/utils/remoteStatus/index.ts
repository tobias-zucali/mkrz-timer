import {
  getConnectionSummary,
  getDescription,
  ROLE_LABELS,
  STATE_LABELS,
} from "./copy.ts"

export type RemoteStatusRole = "control" | "readonly"
export type RemoteStatusState =
  | "connecting"
  | "connected"
  | "failed"
  | "recovered"
  | "reconnecting"

export type RemoteStatusModel = {
  canRetryManually: boolean
  connectionSummary: string
  description: string
  role: RemoteStatusRole
  roleLabel: string
  state: RemoteStatusState
  stateLabel: string
}

function getRemoteState({
  hasConnectedOnce,
  hasReceivedInitialSync,
  isRemoteEnabled,
  lifecycleState,
}: {
  hasConnectedOnce: boolean
  hasReceivedInitialSync: boolean
  isRemoteEnabled: boolean
  lifecycleState: RemoteStatusState
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

export default function getRemoteStatus({
  canRetryManually,
  hasConnectedOnce,
  hasReceivedInitialSync,
  lifecycleState,
  participantCount,
  role,
  showPendingHostStatus = false,
  isRemoteEnabled,
}: {
  canRetryManually: boolean
  hasConnectedOnce: boolean
  hasReceivedInitialSync: boolean
  isRemoteEnabled: boolean
  lifecycleState: RemoteStatusState
  participantCount: number
  role: RemoteStatusRole
  showPendingHostStatus?: boolean
}): RemoteStatusModel | null {
  if (!isRemoteEnabled && !showPendingHostStatus) {
    return null
  }

  const roleLabel = ROLE_LABELS[role]
  const state = getRemoteState({
    hasConnectedOnce,
    hasReceivedInitialSync,
    isRemoteEnabled: Boolean(isRemoteEnabled || showPendingHostStatus),
    lifecycleState,
  })

  return {
    canRetryManually,
    connectionSummary: getConnectionSummary({
      hasReceivedInitialSync,
      participantCount,
      role,
      state,
    }),
    description: getDescription(role, state),
    role,
    roleLabel,
    state,
    stateLabel: STATE_LABELS[state],
  }
}
