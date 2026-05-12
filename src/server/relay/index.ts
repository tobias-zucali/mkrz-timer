import { createServer } from "node:http"

import { WebSocket, WebSocketServer } from "ws"

import { InMemorySessionStore } from "../remoteSession/sessionStore.ts"
import type {
  RelayClientMessage,
  RelayServerMessage,
} from "../../shared/remoteSession/types.ts"

const host = process.env.RELAY_HOST || "127.0.0.1"
const port = Number(process.env.RELAY_PORT || "9100")
const sessionTtlMs = Number(process.env.RELAY_SESSION_TTL_MS || "300000")

const store = new InMemorySessionStore(sessionTtlMs)
const socketsByClientId = new Map<string, WebSocket>()
const sessionsByClientId = new Map<string, string>()

const server = createServer((request, response) => {
  const requestUrl = new URL(
    request.url || "/",
    `http://${request.headers.host}`,
  )

  if (requestUrl.pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json" })
    response.end(JSON.stringify({ ok: true }))
    return
  }

  response.writeHead(404)
  response.end("Not found")
})

const wss = new WebSocketServer({ server, path: "/ws" })

const send = (socket: WebSocket, message: RelayServerMessage) => {
  socket.send(JSON.stringify(message))
}

const broadcastSession = (sessionId: string) => {
  const session = store.touch(sessionId)
  if (!session) {
    return
  }

  const message: RelayServerMessage = {
    type: "state-updated",
    participants: session.participants,
    sessionId: session.id,
    snapshot: session.snapshot,
  }

  for (const participant of session.participants) {
    const socket = socketsByClientId.get(participant.clientId)
    if (socket && socket.readyState === WebSocket.OPEN) {
      send(socket, message)
    }
  }
}

const broadcastParticipants = (sessionId: string) => {
  const session = store.touch(sessionId)
  if (!session) {
    return
  }

  const message: RelayServerMessage = {
    type: "participant-list",
    participants: session.participants,
    sessionId: session.id,
  }

  for (const participant of session.participants) {
    const socket = socketsByClientId.get(participant.clientId)
    if (socket && socket.readyState === WebSocket.OPEN) {
      send(socket, message)
    }
  }
}

wss.on("connection", (socket: WebSocket) => {
  let currentClientId = ""

  socket.on("message", (value: WebSocket.RawData) => {
    let message: RelayClientMessage

    try {
      message = JSON.parse(String(value)) as RelayClientMessage
    } catch {
      send(socket, {
        type: "error",
        message: "Could not parse relay message.",
      })
      return
    }

    currentClientId = message.clientId
    socketsByClientId.set(message.clientId, socket)

    switch (message.type) {
      case "create-or-join": {
        const session = store.createOrJoin({
          canControl: message.canControl,
          clientId: message.clientId,
          sessionId: message.sessionId,
          snapshot: message.snapshot,
        })
        sessionsByClientId.set(message.clientId, session.id)
        send(socket, {
          type: "session",
          participants: session.participants,
          sessionId: session.id,
          snapshot: session.snapshot,
        })
        broadcastParticipants(session.id)
        return
      }
      case "retry-join": {
        const session = store.restoreSession({
          canControl: message.canControl,
          clientId: message.clientId,
          sessionId: message.sessionId,
          snapshot: message.snapshot,
        })
        if (!session) {
          send(socket, {
            type: "error",
            message:
              "Remote session expired. Reopen remote mode from a control client.",
          })
          return
        }
        sessionsByClientId.set(message.clientId, session.id)
        send(socket, {
          type: "session",
          participants: session.participants,
          sessionId: session.id,
          snapshot: session.snapshot,
        })
        broadcastParticipants(session.id)
        return
      }
      case "sync": {
        const session = store.updateSnapshot({
          clientId: message.clientId,
          params: message.params,
          sessionId: message.sessionId,
          state: message.state,
        })

        if (!session) {
          send(socket, {
            type: "error",
            message: "Remote session is unavailable.",
          })
          return
        }

        broadcastSession(session.id)
        return
      }
      case "heartbeat":
        store.touch(message.sessionId)
        return
      case "leave": {
        const session = store.leave(message.sessionId, message.clientId)
        socketsByClientId.delete(message.clientId)
        sessionsByClientId.delete(message.clientId)
        if (session) {
          broadcastParticipants(session.id)
        }
        return
      }
    }
  })

  socket.on("close", () => {
    if (!currentClientId) {
      return
    }

    socketsByClientId.delete(currentClientId)
    const sessionId = sessionsByClientId.get(currentClientId)
    sessionsByClientId.delete(currentClientId)
    if (!sessionId) {
      return
    }

    const session = store.leave(sessionId, currentClientId)
    if (session) {
      broadcastParticipants(session.id)
    }
  })
})

const sweepInterval = setInterval(() => {
  store.sweepExpired()
}, 60_000)

server.listen(port, host, () => {
  process.stdout.write(`Started relay on http://${host}:${port}\n`)
})

const shutdown = (signal: string) => {
  clearInterval(sweepInterval)
  process.stdout.write(`Stopping relay on ${signal}\n`)
  wss.close(() => {
    server.close(() => {
      process.exit(0)
    })
  })
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
