import type { TimerState } from "../useTimer"
import type {
  RemoteAccessRole,
  RelayClientMessage,
  SessionSnapshot,
  SyncParams,
} from "../../shared/remoteSession/types.ts"
import {
  normalizeRelayServerMessage,
  normalizeSessionSnapshot,
} from "../../shared/security/input.ts"

export const createLocalClientId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }

  return `client-${Math.random().toString(36).slice(2, 10)}`
}

export const parseServerMessage = (event: MessageEvent<string>) => {
  return normalizeRelayServerMessage(event.data)
}

const createSnapshot = ({
  syncParams,
  syncState,
}: {
  syncParams: SyncParams
  syncState: TimerState
}): SessionSnapshot => ({
  ...normalizeSessionSnapshot({
    params: syncParams,
    state: syncState,
  }),
})

export const buildJoinMessage = ({
  clientId,
  remoteRole,
  remoteToken,
  retryType,
  syncParams,
  syncState,
}: {
  clientId: string
  remoteRole?: RemoteAccessRole | null
  remoteToken?: string | null
  retryType: "create-session" | "join-session" | "retry-join-session"
  syncParams: SyncParams
  syncState: TimerState
}): RelayClientMessage => {
  if (retryType === "create-session") {
    return {
      clientId,
      snapshot: createSnapshot({ syncParams, syncState }),
      type: "create-session",
    }
  }

  if (!remoteRole || !remoteToken) {
    throw new Error("Remote join links require a role and token.")
  }

  if (retryType === "retry-join-session") {
    return {
      clientId,
      role: remoteRole,
      snapshot:
        remoteRole === "control"
          ? createSnapshot({ syncParams, syncState })
          : undefined,
      token: remoteToken,
      type: "retry-join-session",
    }
  }

  return {
    clientId,
    role: remoteRole,
    token: remoteToken,
    type: "join-session",
  }
}

export const buildSyncMessage = ({
  clientId,
  params,
  sessionId,
  state,
}: {
  clientId: string
  params?: Partial<SyncParams>
  sessionId: string
  state?: TimerState
}): RelayClientMessage => ({
  type: "sync",
  clientId,
  params,
  sessionId,
  state,
})

export const buildHeartbeatMessage = ({
  clientId,
  sessionId,
}: {
  clientId: string
  sessionId: string
}): RelayClientMessage => ({
  type: "heartbeat",
  clientId,
  sessionId,
})

export const buildLeaveMessage = ({
  clientId,
  sessionId,
}: {
  clientId: string
  sessionId: string
}): RelayClientMessage => ({
  type: "leave",
  clientId,
  sessionId,
})
