import { PeerServer } from "peer"

const host = process.env.PEERJS_HOST || "127.0.0.1"
const port = Number(process.env.PEERJS_PORT || "9100")
const path = process.env.PEERJS_PATH || "/"
const writeLine = (message) => process.stdout.write(`${message}\n`)

const server = PeerServer({
  host,
  path,
  port,
})

writeLine(`Started PeerServer on ${host}:${port}${path}`)

let isShuttingDown = false

const shutdown = (signal) => {
  if (isShuttingDown) {
    return
  }
  isShuttingDown = true
  writeLine(`Stopping PeerServer on ${signal}`)
  const exitTimer = setTimeout(() => {
    process.exit(0)
  }, 1000)
  server._wss?.close?.()
  server._httpServer?.close?.(() => {
    clearTimeout(exitTimer)
    process.exit(0)
  })
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
