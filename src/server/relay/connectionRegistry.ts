import { WebSocket } from "ws"

import type {
  RelayServerMessage,
  SessionParticipant,
} from "../../shared/liveSession/types.ts"

export class RelayConnectionRegistry {
  private readonly socketsByClientId = new Map<string, WebSocket>()
  private readonly sessionsByClientId = new Map<string, string>()

  register(clientId: string, socket: WebSocket) {
    this.socketsByClientId.set(clientId, socket)
  }

  attachSession(clientId: string, sessionId: string) {
    this.sessionsByClientId.set(clientId, sessionId)
  }

  getSessionId(clientId: string) {
    return this.sessionsByClientId.get(clientId)
  }

  clearClient(clientId: string) {
    this.socketsByClientId.delete(clientId)
    this.sessionsByClientId.delete(clientId)
  }

  sendToSocket(socket: WebSocket, message: RelayServerMessage) {
    socket.send(JSON.stringify(message))
  }

  broadcastToParticipants(
    participants: SessionParticipant[],
    message: RelayServerMessage,
  ) {
    for (const participant of participants) {
      const socket = this.socketsByClientId.get(participant.clientId)
      if (socket && socket.readyState === WebSocket.OPEN) {
        this.sendToSocket(socket, message)
      }
    }
  }
}
