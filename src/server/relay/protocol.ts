import type { WebSocket } from "ws"

import type {
  RelayClientMessage,
  RelayServerMessage,
  SessionSnapshot,
} from "@/shared/remoteSession/types.ts"
import type { RelaySessionRecord } from "@/server/remoteSession/sessionStore.ts"

import type { RelayConnectionRegistry } from "./connectionRegistry.ts"

export const parseClientMessage = (value: WebSocket.RawData) => {
  try {
    return JSON.parse(String(value)) as RelayClientMessage
  } catch {
    return null
  }
}

export const createErrorMessage = (message: string): RelayServerMessage => ({
  type: "error",
  message,
})

export const createSessionMessage = (
  session: RelaySessionRecord,
): RelayServerMessage => ({
  type: "session",
  participants: session.participants,
  sessionId: session.id,
  snapshot: session.snapshot,
})

export const createStateUpdatedMessage = (
  session: RelaySessionRecord,
): RelayServerMessage => ({
  type: "state-updated",
  participants: session.participants,
  sessionId: session.id,
  snapshot: session.snapshot,
})

export const createParticipantListMessage = (
  session: RelaySessionRecord,
): RelayServerMessage => ({
  type: "participant-list",
  participants: session.participants,
  sessionId: session.id,
})

export const respondWithSession = ({
  registry,
  session,
  socket,
}: {
  registry: RelayConnectionRegistry
  session: RelaySessionRecord
  socket: WebSocket
}) => {
  registry.sendToSocket(socket, createSessionMessage(session))
  registry.broadcastToParticipants(
    session.participants,
    createParticipantListMessage(session),
  )
}

export const hasSessionSnapshot = (
  snapshot: SessionSnapshot | undefined,
): snapshot is SessionSnapshot => snapshot !== undefined
