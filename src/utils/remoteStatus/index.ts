import {
  getClientConnectionSummary,
  getControlClientDescription,
  getMainConnectionSummary,
  getMainDescription,
  getReadonlyClientDescription,
  ROLE_LABELS,
  STATE_LABELS,
} from "./copy.ts"

export type RemoteStatusRole = "main" | "control-client" | "readonly-client"
export type RemoteStatusState =
  | "connecting"
  | "connected"
  | "degraded"
  | "failed"
  | "recovered"
  | "reconnecting"

type RemoteStatusConnection = {
  isAlive: boolean
}

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
  lifecycleState,
  peerId,
  role,
  unstableConnections,
}: {
  hasConnectedOnce: boolean
  hasReceivedInitialSync: boolean
  lifecycleState: RemoteStatusModel["state"]
  peerId?: string
  role: RemoteStatusRole
  unstableConnections: number
}) {
  if (lifecycleState === "failed" || lifecycleState === "recovered") {
    return lifecycleState
  }

  const isUnsyncedClient = role !== "main" && !hasReceivedInitialSync
  if (!peerId || isUnsyncedClient) {
    return hasConnectedOnce ? "reconnecting" : "connecting"
  }

  if (unstableConnections > 0) {
    return "degraded"
  }

  if (lifecycleState === "reconnecting") {
    return "reconnecting"
  }

  return "connected"
}

export default function getRemoteStatus({
  canRetryManually,
  control,
  connectionDetails,
  connectionsCount,
  hasConnectedOnce,
  hasReceivedInitialSync,
  lifecycleState,
  peerId,
  showPendingHostStatus = false,
  remoteIdParam,
}: {
  canRetryManually: boolean
  control?: string | null
  connectionDetails: RemoteStatusConnection[]
  connectionsCount: number
  hasConnectedOnce: boolean
  hasReceivedInitialSync: boolean
  lifecycleState:
    | "connected"
    | "connecting"
    | "failed"
    | "recovered"
    | "reconnecting"
  peerId?: string
  showPendingHostStatus?: boolean
  remoteIdParam?: string | null
}): RemoteStatusModel | null {
  if (!remoteIdParam && !showPendingHostStatus) {
    return null
  }

  const isReadonlyClient = Boolean(remoteIdParam) && control !== "42"
  const role: RemoteStatusRole = isReadonlyClient
    ? "readonly-client"
    : !remoteIdParam || peerId === remoteIdParam
      ? "main"
      : "control-client"
  const roleLabel = ROLE_LABELS[role]

  const unstableConnections = connectionDetails.filter(
    ({ isAlive }) => !isAlive,
  ).length
  const healthyConnections = Math.max(connectionsCount - unstableConnections, 0)
  const isUnsyncedClient = role !== "main" && !hasReceivedInitialSync

  const state = getRemoteState({
    hasConnectedOnce,
    hasReceivedInitialSync,
    lifecycleState,
    peerId,
    role,
    unstableConnections,
  })
  const stateLabel = STATE_LABELS[state]

  if (role === "main") {
    return {
      canRetryManually,
      connectionSummary: getMainConnectionSummary({
        connectionsCount,
        healthyConnections,
        state,
      }),
      description: getMainDescription(state),
      role,
      roleLabel,
      state,
      stateLabel,
    }
  }

  return {
    canRetryManually,
    connectionSummary: getClientConnectionSummary({
      isUnsyncedClient,
      state,
    }),
    description:
      role === "control-client"
        ? getControlClientDescription({ isUnsyncedClient, state })
        : getReadonlyClientDescription({ isUnsyncedClient, state }),
    role,
    roleLabel,
    state,
    stateLabel,
  }
}
