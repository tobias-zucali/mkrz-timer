import { spawn, spawnSync } from "node:child_process"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const scriptPath = fileURLToPath(import.meta.url)
const scriptsDir = path.dirname(scriptPath)
const repoRoot = path.dirname(scriptsDir)

const packageJson = JSON.parse(
  await readFile(path.join(repoRoot, "package.json"), "utf8"),
)

const minNodeVersion =
  packageJson.engines?.node?.match(/>=\s*([0-9]+\.[0-9]+\.[0-9]+)/)?.[1] ??
  "22.6.0"

const LANE_DIR = path.join(repoRoot, ".agent-lane")
const APP_HOST = "127.0.0.1"
const APP_PORT = 3300
const RELAY_PORT = 9200
const APP_URL = `http://${APP_HOST}:${APP_PORT}`
const RELAY_URL = `http://${APP_HOST}:${RELAY_PORT}/health`
const DEFAULT_MANAGED_CONFIG = "playwright.agent.config.ts"
const DEFAULT_ATTACH_CONFIG = "playwright.agent.no-webserver.config.ts"

const nodeExec = process.execPath
const nextBinPath = path.join(repoRoot, "node_modules/next/dist/bin/next")
const relayScriptPath = path.join(repoRoot, "src/server/relay/index.ts")
const playwrightCliPath = path.join(
  repoRoot,
  "node_modules/@playwright/test/cli.js",
)

const serviceDefinitions = {
  "app-manual": {
    id: "app-manual",
    kind: "app",
    role: "manual",
    metadataPath: path.join(LANE_DIR, "app-manual.json"),
    port: APP_PORT,
    url: APP_URL,
    distDir: ".next-agent",
    command: [
      nodeExec,
      nextBinPath,
      "dev",
      "-H",
      APP_HOST,
      "-p",
      `${APP_PORT}`,
    ],
    env: {
      NEXT_DIST_DIR: ".next-agent",
      NEXT_PUBLIC_REMOTE_WS_URL: `ws://${APP_HOST}:${RELAY_PORT}/ws`,
    },
  },
  "app-test": {
    id: "app-test",
    kind: "app",
    role: "test",
    metadataPath: path.join(LANE_DIR, "app-test.json"),
    port: APP_PORT,
    url: APP_URL,
    distDir: ".next-agent-e2e",
    command: [
      nodeExec,
      nextBinPath,
      "dev",
      "-H",
      APP_HOST,
      "-p",
      `${APP_PORT}`,
    ],
    env: {
      NEXT_DIST_DIR: ".next-agent-e2e",
      NEXT_PUBLIC_REMOTE_WS_URL: `ws://${APP_HOST}:${RELAY_PORT}/ws`,
    },
  },
  relay: {
    id: "relay",
    kind: "relay",
    role: "test",
    metadataPath: path.join(LANE_DIR, "relay.json"),
    port: RELAY_PORT,
    url: RELAY_URL,
    command: [
      nodeExec,
      "--no-warnings=ExperimentalWarning",
      "--experimental-strip-types",
      "--experimental-default-type=module",
      relayScriptPath,
    ],
    env: {
      RELAY_PORT: `${RELAY_PORT}`,
    },
  },
}

const parseVersion = (value) =>
  value
    .replace(/^v/, "")
    .split(".")
    .map((segment) => Number.parseInt(segment, 10))

const isVersionAtLeast = (current, minimum) => {
  const currentParts = parseVersion(current)
  const minimumParts = parseVersion(minimum)
  const maxLength = Math.max(currentParts.length, minimumParts.length)

  for (let index = 0; index < maxLength; index += 1) {
    const currentPart = currentParts[index] ?? 0
    const minimumPart = minimumParts[index] ?? 0

    if (currentPart > minimumPart) {
      return true
    }
    if (currentPart < minimumPart) {
      return false
    }
  }

  return true
}

const fail = (message) => {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

if (!isVersionAtLeast(process.version, minNodeVersion)) {
  fail(
    [
      `Node.js ${minNodeVersion}+ is required for the agent lane.`,
      `Current runtime: ${process.version}`,
      `Re-run with a supported Node binary, for example:`,
      `  /path/to/node scripts/${path.basename(scriptPath)} ${process.argv.slice(2).join(" ")}`.trimEnd(),
    ].join("\n"),
  )
}

const ensureLaneDir = async () => {
  await mkdir(LANE_DIR, { recursive: true })
}

const processAlive = (pid) => {
  if (!pid) {
    return false
  }

  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const safeReadJson = async (filePath) => {
  try {
    return JSON.parse(await readFile(filePath, "utf8"))
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null
    }

    throw error
  }
}

const removeMetadata = async (filePath) => {
  await rm(filePath, { force: true })
}

const readMetadata = async (service) => {
  const metadata = await safeReadJson(service.metadataPath)
  if (!metadata) {
    return null
  }

  return {
    ...metadata,
    wrapperAlive: processAlive(metadata.wrapperPid),
    childAlive: processAlive(metadata.childPid),
  }
}

const writeMetadata = async (service, metadata) => {
  await ensureLaneDir()
  await writeFile(service.metadataPath, JSON.stringify(metadata, null, 2))
}

const runCommand = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
  })

  if (result.error) {
    throw result.error
  }

  return result
}

const listListeners = (port) => {
  try {
    const result = runCommand("lsof", [
      "-nP",
      `-iTCP:${port}`,
      "-sTCP:LISTEN",
      "-Fpc",
    ])

    if (result.status !== 0) {
      return []
    }

    const listeners = []
    let current = null

    for (const line of result.stdout.split("\n")) {
      if (!line) {
        continue
      }

      const prefix = line[0]
      const value = line.slice(1)

      if (prefix === "p") {
        if (current) {
          listeners.push(current)
        }

        current = {
          pid: Number.parseInt(value, 10),
          command: "",
        }
      } else if (prefix === "c" && current) {
        current.command = value
      }
    }

    if (current) {
      listeners.push(current)
    }

    return listeners
  } catch {
    return []
  }
}

const getCommandLine = (pid) => {
  if (!pid) {
    return ""
  }

  try {
    const result = runCommand("ps", ["-p", `${pid}`, "-o", "command="])
    if (result.status !== 0) {
      return ""
    }

    return result.stdout.trim()
  } catch {
    return ""
  }
}

const checkHealth = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) })
    return {
      ready: response.ok,
      status: response.status,
      error: null,
    }
  } catch (error) {
    return {
      ready: false,
      status: null,
      error: error instanceof Error ? error.message : `${error}`,
    }
  }
}

const getServiceStatus = async (service) => {
  const listeners = listListeners(service.port)
  const metadata = await readMetadata(service)
  const health = await checkHealth(service.url)
  const metadataPids = [metadata?.wrapperPid, metadata?.childPid].filter(
    Boolean,
  )
  const matchingListeners = listeners.filter((listener) =>
    metadataPids.includes(listener.pid),
  )
  const known =
    matchingListeners.length > 0 &&
    metadata &&
    (metadata.wrapperAlive || metadata.childAlive)

  return {
    service,
    listeners,
    metadata,
    matchingListeners,
    known,
    health,
    hasUnknownListener: listeners.length > 0 && !known,
    staleMetadata:
      Boolean(metadata) &&
      !metadata.wrapperAlive &&
      !metadata.childAlive &&
      listeners.length === 0,
  }
}

const renderServiceStatus = (status) => {
  const {
    service,
    known,
    health,
    listeners,
    metadata,
    hasUnknownListener,
    staleMetadata,
  } = status
  const parts = []

  if (known && health.ready) {
    parts.push(`ready on ${service.url}`)
  } else if (known) {
    parts.push(`listening on ${service.port} but health check failed`)
  } else if (hasUnknownListener) {
    parts.push(`occupied by unknown listener on ${service.port}`)
  } else {
    parts.push(`not running on ${service.port}`)
  }

  if (metadata?.wrapperPid) {
    parts.push(`wrapper pid ${metadata.wrapperPid}`)
  }

  if (metadata?.childPid) {
    parts.push(`child pid ${metadata.childPid}`)
  }

  if (service.distDir) {
    parts.push(`dist ${service.distDir}`)
  }

  if (hasUnknownListener) {
    const descriptions = listeners.map((listener) => {
      const commandLine = getCommandLine(listener.pid)
      const details = commandLine || listener.command
      return `${listener.pid}${details ? ` (${details})` : ""}`
    })

    if (descriptions.length > 0) {
      parts.push(`listeners ${descriptions.join(", ")}`)
    }
  }

  if (staleMetadata) {
    parts.push("stale tracked metadata")
  }

  if (health.error) {
    parts.push(`health ${health.error}`)
  }

  return `- ${service.id}: ${parts.join(" | ")}`
}

const assertServiceAvailableForManaged = (status, commandLabel) => {
  if (status.hasUnknownListener) {
    fail(
      [
        `${commandLabel} cannot use port ${status.service.port} because another process is already listening there.`,
        renderServiceStatus(status),
        `Run \`pnpm lane:agent:status\` to inspect the collision.`,
      ].join("\n"),
    )
  }

  if (status.known) {
    fail(
      [
        `${commandLabel} expected to start a fresh ${status.service.id} service, but a tracked agent lane process is already using port ${status.service.port}.`,
        renderServiceStatus(status),
        `Stop it with \`pnpm lane:agent:stop\` or use attach mode instead.`,
      ].join("\n"),
    )
  }
}

const assertServiceReadyForAttach = (status, commandLabel) => {
  if (status.hasUnknownListener) {
    fail(
      [
        `${commandLabel} found a listener on port ${status.service.port}, but it is not a tracked agent lane process.`,
        renderServiceStatus(status),
        `Use \`pnpm lane:agent:status\` for details and stop the unknown listener before attaching.`,
      ].join("\n"),
    )
  }

  if (!status.known || !status.health.ready) {
    fail(
      [
        `${commandLabel} needs a live tracked ${status.service.id} service on ${status.service.url}, but it is not ready.`,
        renderServiceStatus(status),
        `Start the attach lane with \`pnpm dev:relay:agent\` and \`pnpm dev:agent:test\`, or run \`pnpm lane:agent\` for the managed default.`,
      ].join("\n"),
    )
  }
}

const parseTestOptions = (rawArgs) => {
  const passthroughArgs = []
  let requestedMode = "auto"
  let explicitConfig = null

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index]

    if (arg === "--managed") {
      requestedMode = "managed"
      continue
    }

    if (arg === "--attach") {
      requestedMode = "attach"
      continue
    }

    if (arg === "--config") {
      explicitConfig = rawArgs[index + 1] ?? null
      passthroughArgs.push(arg, rawArgs[index + 1])
      index += 1
      continue
    }

    if (arg.startsWith("--config=")) {
      explicitConfig = arg.slice("--config=".length)
      passthroughArgs.push(arg)
      continue
    }

    passthroughArgs.push(arg)
  }

  if (explicitConfig === DEFAULT_ATTACH_CONFIG) {
    requestedMode = "attach"
  } else if (
    explicitConfig === DEFAULT_MANAGED_CONFIG &&
    requestedMode === "auto"
  ) {
    requestedMode = "auto"
  }

  return {
    passthroughArgs,
    requestedMode,
    explicitConfig,
  }
}

const replaceConfigArg = (args, configPath) => {
  const nextArgs = []
  let replaced = false

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === "--config") {
      nextArgs.push("--config", configPath)
      index += 1
      replaced = true
      continue
    }

    if (arg.startsWith("--config=")) {
      nextArgs.push(`--config=${configPath}`)
      replaced = true
      continue
    }

    nextArgs.push(arg)
  }

  if (!replaced) {
    nextArgs.unshift("--config", configPath)
  }

  return nextArgs
}

const runPlaywright = async (rawArgs) => {
  const options = parseTestOptions(rawArgs)
  const appStatus = await getServiceStatus(serviceDefinitions["app-test"])
  const peerStatus = await getServiceStatus(serviceDefinitions.relay)

  const pairStatuses = [peerStatus, appStatus]
  let resolvedMode = options.requestedMode

  if (resolvedMode === "attach") {
    for (const status of pairStatuses) {
      assertServiceReadyForAttach(status, "Attach mode")
    }
  } else if (resolvedMode === "managed") {
    for (const status of pairStatuses) {
      assertServiceAvailableForManaged(status, "Managed mode")
    }
  } else {
    const allReady = pairStatuses.every(
      (status) => status.known && status.health.ready,
    )
    const allFree = pairStatuses.every(
      (status) => !status.known && !status.hasUnknownListener,
    )
    const hasUnknown = pairStatuses.some((status) => status.hasUnknownListener)
    const hasPartial = pairStatuses.some((status) => status.known) && !allReady

    if (allReady) {
      resolvedMode = "attach"
    } else if (allFree) {
      resolvedMode = "managed"
    } else if (hasUnknown) {
      fail(
        [
          "The agent lane ports are occupied by processes that are not tracked as the current agent lane.",
          ...pairStatuses
            .filter((status) => status.hasUnknownListener)
            .map(renderServiceStatus),
          "Run `pnpm lane:agent:status` to inspect the collision or `pnpm lane:agent:stop` if the tracked lane metadata is stale.",
        ].join("\n"),
      )
    } else if (hasPartial) {
      fail(
        [
          "The agent lane is only partially up, so the launcher will not guess whether to attach or restart it.",
          ...pairStatuses.map(renderServiceStatus),
          "Stop the tracked lane with `pnpm lane:agent:stop`, or finish starting both attach services before retrying.",
        ].join("\n"),
      )
    }
  }

  const chosenConfig =
    resolvedMode === "attach" ? DEFAULT_ATTACH_CONFIG : DEFAULT_MANAGED_CONFIG
  const playwrightArgs = replaceConfigArg(options.passthroughArgs, chosenConfig)

  process.stdout.write(`Agent lane mode: ${resolvedMode} (${chosenConfig})\n`)

  const child = spawn(
    nodeExec,
    [playwrightCliPath, "test", ...playwrightArgs],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        PLAYWRIGHT_NODE: nodeExec,
        NEXT_PUBLIC_REMOTE_WS_URL:
          process.env.NEXT_PUBLIC_REMOTE_WS_URL ||
          `ws://${APP_HOST}:${RELAY_PORT}/ws`,
      },
      stdio: "inherit",
    },
  )

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(code ?? 1)
  })
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const stopPid = async (pid) => {
  if (!pid || !processAlive(pid)) {
    return false
  }

  process.kill(pid, "SIGTERM")

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!processAlive(pid)) {
      return true
    }

    await sleep(250)
  }

  return false
}

const stopLane = async () => {
  const services = [
    serviceDefinitions.relay,
    serviceDefinitions["app-test"],
    serviceDefinitions["app-manual"],
  ]
  let stoppedAny = false

  for (const service of services) {
    const metadata = await readMetadata(service)
    if (!metadata) {
      continue
    }

    const stopped =
      (await stopPid(metadata.wrapperPid)) || (await stopPid(metadata.childPid))

    if (stopped) {
      process.stdout.write(`Stopped ${service.id}\n`)
      stoppedAny = true
    } else {
      process.stdout.write(`No live tracked process for ${service.id}\n`)
    }

    await removeMetadata(service.metadataPath)
  }

  if (!stoppedAny) {
    process.stdout.write("No tracked agent lane processes were running.\n")
  }
}

const showStatus = async () => {
  const statuses = await Promise.all([
    getServiceStatus(serviceDefinitions["app-manual"]),
    getServiceStatus(serviceDefinitions["app-test"]),
    getServiceStatus(serviceDefinitions.relay),
  ])

  process.stdout.write("Agent lane status\n")
  for (const status of statuses) {
    process.stdout.write(`${renderServiceStatus(status)}\n`)
  }
}

const serveService = async (service) => {
  const statuses = await Promise.all([
    getServiceStatus(service),
    ...(service.port === APP_PORT
      ? [
          getServiceStatus(
            service.id === "app-test"
              ? serviceDefinitions["app-manual"]
              : serviceDefinitions["app-test"],
          ),
        ]
      : []),
  ])

  const currentStatus = statuses[0]

  if (currentStatus.hasUnknownListener) {
    fail(
      [
        `Cannot start ${service.id}; port ${service.port} is already in use by an unknown process.`,
        renderServiceStatus(currentStatus),
        `Run \`pnpm lane:agent:status\` to inspect the collision.`,
      ].join("\n"),
    )
  }

  if (currentStatus.known) {
    fail(
      [
        `${service.id} is already running.`,
        renderServiceStatus(currentStatus),
        `Use \`pnpm lane:agent:stop\` before starting a fresh lane.`,
      ].join("\n"),
    )
  }

  const conflictingKnownStatus = statuses
    .slice(1)
    .find((status) => status.known || status.hasUnknownListener)

  if (conflictingKnownStatus) {
    fail(
      [
        `${service.id} shares port ${service.port} with ${conflictingKnownStatus.service.id}, so both roles cannot run at once.`,
        renderServiceStatus(conflictingKnownStatus),
        `Stop the existing service with \`pnpm lane:agent:stop\` before switching roles.`,
      ].join("\n"),
    )
  }

  const child = spawn(service.command[0], service.command.slice(1), {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...service.env,
    },
    stdio: "inherit",
  })

  await writeMetadata(service, {
    id: service.id,
    kind: service.kind,
    role: service.role,
    port: service.port,
    url: service.url,
    distDir: service.distDir ?? null,
    wrapperPid: process.pid,
    childPid: child.pid,
    startedAt: new Date().toISOString(),
  })

  const cleanup = async () => {
    await removeMetadata(service.metadataPath)
  }

  let shuttingDown = false

  const forwardSignal = (signal) => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true

    if (child.pid && processAlive(child.pid)) {
      child.kill(signal)
    }
  }

  process.on("SIGINT", () => forwardSignal("SIGINT"))
  process.on("SIGTERM", () => forwardSignal("SIGTERM"))

  child.on("exit", async (code, signal) => {
    await cleanup()

    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(code ?? 1)
  })
}

const main = async () => {
  const [command, ...rawArgs] = process.argv.slice(2)

  switch (command) {
    case "test":
      await runPlaywright(rawArgs)
      break
    case "status":
      await showStatus()
      break
    case "stop":
      await stopLane()
      break
    case "serve": {
      const [kind, roleArg] = rawArgs
      const role = roleArg?.startsWith("--role=")
        ? roleArg.slice("--role=".length)
        : rawArgs[1]

      if (kind === "app" && role === "manual") {
        await serveService(serviceDefinitions["app-manual"])
        break
      }

      if (kind === "app" && role === "test") {
        await serveService(serviceDefinitions["app-test"])
        break
      }

      if (kind === "relay") {
        await serveService(serviceDefinitions.relay)
        break
      }

      fail(
        "Usage: node scripts/agent-lane.mjs serve app --role=manual|test | serve relay",
      )
      break
    }
    default:
      fail(
        [
          "Usage:",
          "  node scripts/agent-lane.mjs test [--managed|--attach] [playwright args...]",
          "  node scripts/agent-lane.mjs status",
          "  node scripts/agent-lane.mjs stop",
          "  node scripts/agent-lane.mjs serve app --role=manual|test",
          "  node scripts/agent-lane.mjs serve relay",
        ].join("\n"),
      )
  }
}

await main()
