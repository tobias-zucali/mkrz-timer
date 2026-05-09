export type RemoteStatusRole = "main" | "control-client" | "readonly-client"
export type RemoteStatusState =
  | "connecting"
  | "connected"
  | "degraded"
  | "reconnecting"

type RemoteStatusConnection = {
  isAlive: boolean
}

export type RemoteStatusModel = {
  connectionSummary: string
  description: string
  role: RemoteStatusRole
  roleLabel: string
  state: RemoteStatusState
  stateLabel: string
}

export default function getRemoteStatus({
  control,
  connectionDetails,
  connectionsCount,
  hasConnectedOnce,
  isConnecting,
  peerId,
  remoteIdParam,
}: {
  control?: string | null
  connectionDetails: RemoteStatusConnection[]
  connectionsCount: number
  hasConnectedOnce: boolean
  isConnecting: boolean
  peerId?: string
  remoteIdParam?: string | null
}): RemoteStatusModel | null {
  if (!remoteIdParam) {
    return null
  }

  const isReadonlyClient = control !== "42"
  const role: RemoteStatusRole = isReadonlyClient
    ? "readonly-client"
    : peerId === remoteIdParam
      ? "main"
      : "control-client"

  const roleLabel =
    role === "main"
      ? "Main host"
      : role === "control-client"
        ? "Control client"
        : "Readonly client"

  const unstableConnections = connectionDetails.filter(
    ({ isAlive }) => !isAlive,
  ).length
  const healthyConnections = Math.max(connectionsCount - unstableConnections, 0)

  const state: RemoteStatusState = !peerId
    ? hasConnectedOnce
      ? "reconnecting"
      : "connecting"
    : unstableConnections > 0 || isConnecting
      ? unstableConnections > 0
        ? "degraded"
        : "reconnecting"
      : "connected"

  const stateLabel =
    state === "connecting"
      ? "Connecting"
      : state === "reconnecting"
        ? "Reconnecting"
        : state === "degraded"
          ? "Degraded connection"
          : "Connected"

  if (role === "main") {
    return {
      connectionSummary:
        state === "degraded"
          ? `${healthyConnections} of ${connectionsCount} peer links healthy`
          : `${connectionsCount} connected ${connectionsCount === 1 ? "peer" : "peers"}`,
      description:
        state === "connecting"
          ? "Starting the remote session."
          : state === "reconnecting"
            ? "Trying to restore the host session for connected peers."
            : state === "degraded"
              ? "Some connected peers are delayed or temporarily unavailable."
              : "Hosting the remote timer session.",
      role,
      roleLabel,
      state,
      stateLabel,
    }
  }

  return {
    connectionSummary:
      state === "degraded"
        ? "Host link is unstable"
        : state === "connected"
          ? "Connected to host"
          : "Waiting for host connection",
    description:
      role === "control-client"
        ? state === "degraded"
          ? "Control access remains available once the host link recovers."
          : state === "connected"
            ? "Can control the shared timer and settings."
            : "Joining the shared timer with control access."
        : state === "degraded"
          ? "Timer updates may lag until the host link recovers."
          : state === "connected"
            ? "Viewing the shared timer without controls."
            : "Joining the shared timer as a viewer.",
    role,
    roleLabel,
    state,
    stateLabel,
  }
}
