import type { WebSocket } from "ws"

import type {
  RemoteAccessRole,
  RelayServerMessage,
  SessionSnapshot,
} from "../../shared/remoteSession/types.ts"
import { normalizeRelayClientMessage } from "../../shared/security/input.ts"
import type { RelaySessionRecord } from "../remoteSession/sessionStore.ts"

import type { RelayConnectionRegistry } from "./connectionRegistry.ts"

export const parseClientMessage = (value: WebSocket.RawData) => {
  return normalizeRelayClientMessage(String(value))
}

export const createErrorMessage = (message: string): RelayServerMessage => ({
  type: "error",
  message,
})

export const createSessionMessage = (
  session: RelaySessionRecord,
  role: RemoteAccessRole,
  serverTimestamp: number,
): RelayServerMessage => ({
  ...(role === "control" ? { accessTokens: session.accessTokens } : {}),
  type: "session",
  participants: session.participants,
  serverTimestamp,
  sessionId: session.id,
  snapshot: session.snapshot,
})

export const createStateUpdatedMessage = (
  session: RelaySessionRecord,
  serverTimestamp: number,
): RelayServerMessage => ({
  type: "state-updated",
  participants: session.participants,
  serverTimestamp,
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
  role,
  session,
  socket,
}: {
  registry: RelayConnectionRegistry
  role: RemoteAccessRole
  session: RelaySessionRecord
  socket: WebSocket
}) => {
  const serverTimestamp = Date.now()
  registry.sendToSocket(
    socket,
    createSessionMessage(session, role, serverTimestamp),
  )
  registry.broadcastToParticipants(
    session.participants,
    createParticipantListMessage(session),
  )
}

export const hasSessionSnapshot = (
  snapshot: SessionSnapshot | undefined,
): snapshot is SessionSnapshot => snapshot !== undefined
