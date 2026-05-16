import type { TimerState } from "../useTimer"
import type {
  RemoteAccessTokenSet,
  RelayServerMessage,
  SessionParticipant,
  SyncParams,
} from "../../shared/remoteSession/types.ts"

import { buildSyncMessage } from "./protocol.ts"

type SessionSyncActions = {
  applySnapshot: (snapshot: { params: SyncParams; state: TimerState }) => void
  completeConnect: (
    sessionId: string,
    accessTokens?: RemoteAccessTokenSet,
  ) => void
  log: (event: string) => void
  markConnected: (wasReconnect: boolean) => void
  setAccessTokens: (accessTokens?: RemoteAccessTokenSet) => void
  setParticipants: (nextParticipants: SessionParticipant[]) => void
  setSessionId: (nextSessionId?: string) => void
}

type ParticipantListActions = {
  canPublishSessionState: boolean
  clientId: string
  hasReceivedInitialSync: boolean
  log: (event: string) => void
  sendMessage: (message: ReturnType<typeof buildSyncMessage>) => boolean
  setParticipants: (nextParticipants: SessionParticipant[]) => void
  setSessionId: (nextSessionId?: string) => void
  syncParams: SyncParams
  syncState: TimerState
}

type ErrorActions = {
  failConnect: (error: Error) => void
  log: (event: string) => void
  setRetryableFailure: (error: Error) => void
}

type MessageContext = {
  wasReconnect: boolean
  onError: ErrorActions
  onParticipantList: ParticipantListActions
  onSessionSync: SessionSyncActions
}

const applySessionSyncMessage = ({
  actions,
  message,
  wasReconnect,
}: {
  actions: SessionSyncActions
  message: Extract<RelayServerMessage, { type: "session" | "state-updated" }>
  wasReconnect: boolean
}) => {
  actions.setSessionId(message.sessionId)
  if (message.type === "session" && message.accessTokens) {
    actions.setAccessTokens(message.accessTokens)
  }
  actions.completeConnect(
    message.sessionId,
    message.type === "session" ? message.accessTokens : undefined,
  )
  actions.setParticipants(message.participants)
  actions.applySnapshot(message.snapshot)
  actions.markConnected(wasReconnect)
  actions.log(`session_sync: ${message.sessionId}`)
}

const applyParticipantListMessage = ({
  actions,
  message,
}: {
  actions: ParticipantListActions
  message: Extract<RelayServerMessage, { type: "participant-list" }>
}) => {
  actions.setSessionId(message.sessionId)
  actions.setParticipants(message.participants)
  actions.log(`participants: ${message.participants.length}`)

  if (!actions.canPublishSessionState || !actions.hasReceivedInitialSync) {
    return
  }

  actions.sendMessage(
    buildSyncMessage({
      clientId: actions.clientId,
      params: actions.syncParams,
      sessionId: message.sessionId,
      state: actions.syncState,
    }),
  )
  actions.log(`sync_sent: ${message.sessionId}`)
}

const applyErrorMessage = ({
  actions,
  message,
}: {
  actions: ErrorActions
  message: Extract<RelayServerMessage, { type: "error" }>
}) => {
  const error = new Error(message.message)
  actions.failConnect(error)
  actions.setRetryableFailure(error)
  actions.log(`relay_error: ${message.message}`)
}

export const applyServerMessage = ({
  context,
  message,
}: {
  message: RelayServerMessage
  context: MessageContext
}) => {
  switch (message.type) {
    case "session":
    case "state-updated":
      applySessionSyncMessage({
        actions: context.onSessionSync,
        message,
        wasReconnect: context.wasReconnect,
      })
      return
    case "participant-list":
      applyParticipantListMessage({
        actions: context.onParticipantList,
        message,
      })
      return
    case "error":
      applyErrorMessage({
        actions: context.onError,
        message,
      })
      return
  }
}
