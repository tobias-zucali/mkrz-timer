import { spawn } from "node:child_process"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const scriptPath = fileURLToPath(import.meta.url)
const scriptsDir = path.dirname(scriptPath)
const repoRoot = path.dirname(scriptsDir)

const nodeExec = process.execPath
const nextBinPath = path.join(repoRoot, "node_modules/next/dist/bin/next")
const relayEntryPath = path.join(repoRoot, "src/server/relay/index.ts")

const relayHost = process.env.RELAY_HOST || "127.0.0.1"
const relayPort = process.env.RELAY_PORT || "9100"
const relayWebSocketUrl =
  process.env.NEXT_PUBLIC_REMOTE_WS_URL || `ws://${relayHost}:${relayPort}/ws`

const children = new Set()
let exiting = false

const spawnChild = (label, command, args, env) => {
  const child = spawn(command, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  })

  child.on("exit", (code, signal) => {
    children.delete(child)
    if (exiting) {
      return
    }

    const reason =
      signal !== null
        ? `${label} exited with signal ${signal}`
        : `${label} exited with code ${code ?? 0}`
    process.stderr.write(`${reason}\n`)
    shutdown(code ?? 1)
  })

  children.add(child)
  return child
}

const shutdown = (exitCode = 0) => {
  if (exiting) {
    return
  }

  exiting = true
  for (const child of children) {
    child.kill("SIGTERM")
  }

  setTimeout(() => {
    for (const child of children) {
      child.kill("SIGKILL")
    }
    process.exit(exitCode)
  }, 5_000).unref()

  if (children.size === 0) {
    process.exit(exitCode)
  }
}

spawnChild(
  "relay",
  nodeExec,
  [
    "--no-warnings=ExperimentalWarning",
    "--experimental-strip-types",
    "--experimental-default-type=module",
    relayEntryPath,
  ],
  {
    RELAY_HOST: relayHost,
    RELAY_PORT: relayPort,
  },
)

spawnChild("next", nodeExec, [nextBinPath, "dev"], {
  NEXT_PUBLIC_REMOTE_WS_URL: relayWebSocketUrl,
})

process.on("SIGINT", () => shutdown(0))
process.on("SIGTERM", () => shutdown(0))
