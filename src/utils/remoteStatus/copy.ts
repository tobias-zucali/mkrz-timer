import type { RemoteStatusRole, RemoteStatusState } from "@/utils/remoteStatus"

export const ROLE_LABELS: Record<RemoteStatusRole, string> = {
  "control-client": "Control client",
  main: "Main host",
  "readonly-client": "Readonly client",
}

export const STATE_LABELS: Record<RemoteStatusState, string> = {
  connected: "Connected",
  connecting: "Connecting",
  degraded: "Degraded connection",
  failed: "Reconnect failed",
  recovered: "Recovered",
  reconnecting: "Reconnecting",
}

const MAIN_DESCRIPTIONS: Record<RemoteStatusState, string> = {
  connected: "Hosting the remote timer session.",
  connecting: "Starting the remote session.",
  degraded: "Some connected peers are delayed or temporarily unavailable.",
  failed:
    "Automatic recovery could not restore hosting. Retry to reopen the session.",
  recovered: "This page recovered the host session and is syncing peers again.",
  reconnecting: "Trying to restore the host session for connected peers.",
}

const CLIENT_CONNECTION_SUMMARY: Record<
  Exclude<RemoteStatusState, "connecting" | "reconnecting">,
  string
> = {
  connected: "Connected to host",
  degraded: "Host link is unstable",
  failed: "Recovery needs a retry",
  recovered: "Connected again",
}

const CONTROL_CLIENT_DESCRIPTIONS: Record<
  Exclude<RemoteStatusState, "connecting" | "reconnecting">,
  string
> = {
  connected: "Can control the shared timer and settings.",
  degraded: "Control access remains available once the host link recovers.",
  failed:
    "Automatic recovery could not restore control access yet. Retry to rejoin or reclaim the session.",
  recovered: "Connection recovered. Control access is live again.",
}

const READONLY_CLIENT_DESCRIPTIONS: Record<
  Exclude<RemoteStatusState, "connecting" | "reconnecting">,
  string
> = {
  connected: "Viewing the shared timer without controls.",
  degraded: "Timer updates may lag until the host link recovers.",
  failed:
    "Automatic recovery could not restore the viewer connection. Retry to request a fresh sync.",
  recovered: "Viewer connection recovered and the timer is live again.",
}

export function getMainConnectionSummary({
  connectionsCount,
  healthyConnections,
  state,
}: {
  connectionsCount: number
  healthyConnections: number
  state: RemoteStatusState
}) {
  if (state === "failed") {
    return connectionsCount > 0
      ? "Host session needs recovery"
      : "Host session could not start"
  }

  if (state === "connecting" && connectionsCount === 0) {
    return "Starting host session"
  }

  if (state === "reconnecting" && connectionsCount === 0) {
    return "Restoring host session"
  }

  if (state === "degraded") {
    return `${healthyConnections} of ${connectionsCount} peer links healthy`
  }

  return `${connectionsCount} connected ${connectionsCount === 1 ? "peer" : "peers"}`
}

export function getMainDescription(state: RemoteStatusState) {
  return MAIN_DESCRIPTIONS[state]
}

export function getClientConnectionSummary({
  isUnsyncedClient,
  state,
}: {
  isUnsyncedClient: boolean
  state: RemoteStatusState
}) {
  if (state === "connecting" || state === "reconnecting") {
    return isUnsyncedClient
      ? "Waiting for timer sync"
      : "Waiting for host connection"
  }

  return CLIENT_CONNECTION_SUMMARY[state]
}

export function getControlClientDescription({
  isUnsyncedClient,
  state,
}: {
  isUnsyncedClient: boolean
  state: RemoteStatusState
}) {
  if (state === "connecting" || state === "reconnecting") {
    return isUnsyncedClient
      ? "Joining the shared timer with control access and waiting for the first sync."
      : "Joining the shared timer with control access."
  }

  return CONTROL_CLIENT_DESCRIPTIONS[state]
}

export function getReadonlyClientDescription({
  isUnsyncedClient,
  state,
}: {
  isUnsyncedClient: boolean
  state: RemoteStatusState
}) {
  if (state === "connecting" || state === "reconnecting") {
    return isUnsyncedClient
      ? "Joining the shared timer as a viewer and waiting for the first sync."
      : "Joining the shared timer as a viewer."
  }

  return READONLY_CLIENT_DESCRIPTIONS[state]
}
