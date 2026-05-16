import type { TimerState } from "@/utils/useTimer"
import type {
  RelayClientMessage,
  SessionSnapshot,
  SyncParams,
} from "@/shared/remoteSession/types"
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
  canControlSession,
  nextRemoteId,
  retryType,
  clientId,
  syncParams,
  syncState,
}: {
  canControlSession: boolean
  nextRemoteId?: string | null
  retryType: "create-or-join" | "retry-join"
  clientId: string
  syncParams: SyncParams
  syncState: TimerState
}): RelayClientMessage => {
  if (retryType === "retry-join" && nextRemoteId) {
    return {
      type: "retry-join",
      canControl: canControlSession,
      clientId,
      sessionId: nextRemoteId,
      snapshot: canControlSession
        ? createSnapshot({ syncParams, syncState })
        : undefined,
    }
  }

  return {
    type: "create-or-join",
    canControl: canControlSession || !nextRemoteId,
    clientId,
    sessionId: nextRemoteId || undefined,
    snapshot: createSnapshot({ syncParams, syncState }),
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
