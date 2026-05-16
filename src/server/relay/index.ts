import { createServer } from "node:http"

import { WebSocket, WebSocketServer } from "ws"

import { InMemorySessionStore } from "../remoteSession/sessionStore.ts"
import { RelayConnectionRegistry } from "./connectionRegistry.ts"
import {
  createErrorMessage,
  createParticipantListMessage,
  createStateUpdatedMessage,
  parseClientMessage,
  respondWithSession,
} from "./protocol.ts"

const host = process.env.RELAY_HOST || "127.0.0.1"
const port = Number(process.env.RELAY_PORT || "9100")
const sessionTtlMs = Number(process.env.RELAY_SESSION_TTL_MS || "300000")

const store = new InMemorySessionStore(sessionTtlMs)
const registry = new RelayConnectionRegistry()

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

const broadcastSession = (sessionId: string) => {
  const session = store.touch(sessionId)
  if (!session) {
    return
  }

  registry.broadcastToParticipants(
    session.participants,
    createStateUpdatedMessage(session),
  )
}

const broadcastParticipants = (sessionId: string) => {
  const session = store.touch(sessionId)
  if (!session) {
    return
  }

  registry.broadcastToParticipants(
    session.participants,
    createParticipantListMessage(session),
  )
}

const leaveSession = ({
  clientId,
  sessionId,
}: {
  clientId: string
  sessionId: string
}) => {
  registry.clearClient(clientId)
  const session = store.leave(sessionId, clientId)
  if (session) {
    broadcastParticipants(session.id)
  }
}

wss.on("connection", (socket: WebSocket) => {
  let currentClientId = ""

  socket.on("message", (value: WebSocket.RawData) => {
    const message = parseClientMessage(value)

    if (!message) {
      registry.sendToSocket(
        socket,
        createErrorMessage("Could not parse relay message."),
      )
      return
    }

    currentClientId = message.clientId
    registry.register(message.clientId, socket)

    switch (message.type) {
      case "create-or-join": {
        const session = store.createOrJoin({
          canControl: message.canControl,
          clientId: message.clientId,
          sessionId: message.sessionId,
          snapshot: message.snapshot,
        })
        registry.attachSession(message.clientId, session.id)
        respondWithSession({ registry, session, socket })
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
          registry.sendToSocket(
            socket,
            createErrorMessage(
              "Remote session expired. Reopen remote mode from a control client.",
            ),
          )
          return
        }
        registry.attachSession(message.clientId, session.id)
        respondWithSession({ registry, session, socket })
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
          registry.sendToSocket(
            socket,
            createErrorMessage("Remote session is unavailable."),
          )
          return
        }

        broadcastSession(session.id)
        return
      }
      case "heartbeat":
        store.touch(message.sessionId)
        return
      case "leave":
        leaveSession({
          clientId: message.clientId,
          sessionId: message.sessionId,
        })
        return
    }
  })

  socket.on("close", () => {
    if (!currentClientId) {
      return
    }

    const sessionId = registry.getSessionId(currentClientId)
    if (!sessionId) {
      registry.clearClient(currentClientId)
      return
    }

    leaveSession({ clientId: currentClientId, sessionId })
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
