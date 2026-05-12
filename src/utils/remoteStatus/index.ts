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
  control,
  hasConnectedOnce,
  hasReceivedInitialSync,
  lifecycleState,
  participantCount,
  showPendingHostStatus = false,
  remoteIdParam,
}: {
  canRetryManually: boolean
  control?: string | null
  hasConnectedOnce: boolean
  hasReceivedInitialSync: boolean
  lifecycleState: RemoteStatusState
  participantCount: number
  showPendingHostStatus?: boolean
  remoteIdParam?: string | null
}): RemoteStatusModel | null {
  if (!remoteIdParam && !showPendingHostStatus) {
    return null
  }

  const role: RemoteStatusRole = control === "42" ? "control" : "readonly"
  const roleLabel = ROLE_LABELS[role]
  const state = getRemoteState({
    hasConnectedOnce,
    hasReceivedInitialSync,
    isRemoteEnabled: Boolean(remoteIdParam || showPendingHostStatus),
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
