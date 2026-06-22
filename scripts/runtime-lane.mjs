import { spawn, spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { networkInterfaces } from "node:os"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import {
  acquireManagedE2eLock,
  shouldAcquireManagedE2eLock,
} from "./lib/e2e-runtime-lock.mjs"

const scriptPath = fileURLToPath(import.meta.url)
const scriptsDir = path.dirname(scriptPath)
const repoRoot = path.dirname(scriptsDir)

const nodeExec = process.execPath
const nextBinPath = path.join(repoRoot, "node_modules/next/dist/bin/next")
const relayEntryPath = path.join(repoRoot, "src/server/relay/index.ts")
const playwrightCliPath = path.join(
  repoRoot,
  "node_modules/@playwright/test/cli.js",
)

const BIND_HOST = "0.0.0.0"
const CONNECT_HOST = "127.0.0.1"
const DEFAULT_TIMEOUT_MS = 120_000
const MAX_PORT_ATTEMPTS = 10

const laneDefinitions = {
  dev: {
    id: "dev",
    description: "local development stack",
    preferredAppPort: 3000,
    preferredRelayPort: 9100,
    relayBindHost: process.env.RELAY_HOST || "0.0.0.0",
  },
  test: {
    id: "test",
    description: "Playwright stack",
    preferredAppPort: 3300,
    preferredRelayPort: 9200,
    relayBindHost: BIND_HOST,
  },
}

const fail = (message) => {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const buildRelayWebSocketUrl = (relayPort) =>
  `ws://${CONNECT_HOST}:${relayPort}/ws`

const buildRelayHealthUrl = (relayPort) =>
  `http://${CONNECT_HOST}:${relayPort}/health`

const buildAppUrl = (appPort) => `http://${CONNECT_HOST}:${appPort}`

const getLanIp = () => {
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address
      }
    }
  }
  return null
}
const buildRunId = (laneId, appPort, relayPort) =>
  `${laneId}-${appPort}-${relayPort}`
const buildDistDir = (runId) => `.next-runs/${runId}`
const buildArtifactsRoot = (runId) => `.playwright-runs/${runId}`
const buildReportDir = (runId) =>
  `${buildArtifactsRoot(runId)}/playwright-report`
const buildOutputDir = (runId) => `${buildArtifactsRoot(runId)}/test-results`
const buildManagedE2eCommand = ({ remote = false, passthroughArgs = [] }) => {
  const baseCommand = remote ? "pnpm test:e2e:remote" : "pnpm test:e2e:local"
  return [baseCommand, ...passthroughArgs].join(" ").trim()
}
const latestReportManifestPath = path.join(
  repoRoot,
  ".playwright-runs",
  "latest.json",
)

const checkHealth = async (url) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1_500) })
    return response.ok
  } catch {
    return false
  }
}

const isPortListening = (port) => {
  const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"])

  if (result.error) {
    throw result.error
  }

  return result.status === 0
}

const findOpenPort = async (startPort, blockedPorts = new Set()) => {
  for (let port = startPort; port < startPort + 200; port += 1) {
    if (blockedPorts.has(port)) {
      continue
    }

    if (!isPortListening(port)) {
      return port
    }
  }

  throw new Error(`Could not find an open port starting at ${startPort}.`)
}

const allocateLaneRuntime = async (
  lane,
  {
    preferredAppPort = lane.preferredAppPort,
    preferredRelayPort = lane.preferredRelayPort,
  } = {},
) => {
  const relayPort = await findOpenPort(preferredRelayPort)
  const appPort = await findOpenPort(preferredAppPort, new Set([relayPort]))
  const runId = buildRunId(lane.id, appPort, relayPort)

  return {
    appPort,
    appUrl: buildAppUrl(appPort),
    artifactsRoot: buildArtifactsRoot(runId),
    distDir: buildDistDir(runId),
    relayBindHost: lane.relayBindHost,
    relayPort,
    relayUrl: buildRelayHealthUrl(relayPort),
    relayWebSocketUrl: buildRelayWebSocketUrl(relayPort),
    reportDir: buildReportDir(runId),
    runId,
    outputDir: buildOutputDir(runId),
  }
}

const cleanRuntimePaths = (runtime) => {
  rmSync(path.join(repoRoot, runtime.distDir), {
    force: true,
    recursive: true,
  })
  rmSync(path.join(repoRoot, runtime.artifactsRoot), {
    force: true,
    recursive: true,
  })
}

const writeLatestReportManifest = (runtime) => {
  mkdirSync(path.dirname(latestReportManifestPath), { recursive: true })
  writeFileSync(
    latestReportManifestPath,
    JSON.stringify(
      {
        artifactsRoot: runtime.artifactsRoot,
        appUrl: runtime.appUrl,
        distDir: runtime.distDir,
        outputDir: runtime.outputDir,
        relayUrl: runtime.relayUrl,
        relayWebSocketUrl: runtime.relayWebSocketUrl,
        reportDir: runtime.reportDir,
        runId: runtime.runId,
      },
      null,
      2,
    ) + "\n",
  )
}

const readLatestReportManifest = () => {
  if (!existsSync(latestReportManifestPath)) {
    return null
  }

  try {
    return JSON.parse(readFileSync(latestReportManifestPath, "utf8"))
  } catch {
    return null
  }
}

const resolveReportDir = () => {
  const manifest = readLatestReportManifest()
  if (manifest?.reportDir) {
    return manifest.reportDir
  }

  if (existsSync(path.join(repoRoot, "playwright-report"))) {
    return "playwright-report"
  }

  if (existsSync(path.join(repoRoot, "playwright-report-remote"))) {
    return "playwright-report-remote"
  }

  return null
}

const spawnRelay = (runtime) =>
  spawn(
    nodeExec,
    [
      "--no-warnings=ExperimentalWarning",
      "--experimental-strip-types",
      "--experimental-default-type=module",
      relayEntryPath,
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        RELAY_HOST: runtime.relayBindHost,
        RELAY_PORT: `${runtime.relayPort}`,
      },
      stdio: "inherit",
    },
  )

const spawnApp = (runtime) =>
  spawn(
    nodeExec,
    [nextBinPath, "dev", "-H", BIND_HOST, "-p", `${runtime.appPort}`],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        NEXT_DIST_DIR: runtime.distDir,
        NEXT_PUBLIC_REMOTE_WS_URL:
          process.env.NEXT_PUBLIC_REMOTE_WS_URL || runtime.relayWebSocketUrl,
      },
      stdio: "inherit",
    },
  )

const stopChild = async (child) => {
  if (!child?.pid) {
    return
  }

  try {
    process.kill(child.pid, "SIGTERM")
  } catch {
    return
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      process.kill(child.pid, 0)
    } catch {
      return
    }

    await sleep(250)
  }

  try {
    process.kill(child.pid, "SIGKILL")
  } catch {
    // Ignore already-exited children.
  }
}

const waitForUrl = async ({
  url,
  child,
  label,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) => {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (await checkHealth(url)) {
      return
    }

    if (child.exitCode !== null) {
      throw new Error(`${label} exited before becoming ready.`)
    }

    await sleep(500)
  }

  throw new Error(
    `${label} did not become ready at ${url} within ${timeoutMs}ms.`,
  )
}

const launchStackChildren = async (
  lane,
  {
    preferredAppPort = lane.preferredAppPort,
    preferredRelayPort = lane.preferredRelayPort,
  } = {},
) => {
  const runtime = await allocateLaneRuntime(lane, {
    preferredAppPort,
    preferredRelayPort,
  })
  cleanRuntimePaths(runtime)
  const relayChild = spawnRelay(runtime)

  try {
    await waitForUrl({
      url: runtime.relayUrl,
      child: relayChild,
      label: `${lane.description} relay`,
    })
  } catch (error) {
    await stopChild(relayChild)
    throw error
  }

  const appChild = spawnApp(runtime)

  try {
    await waitForUrl({
      url: runtime.appUrl,
      child: appChild,
      label: `${lane.description} app`,
    })
  } catch (error) {
    await stopChild(appChild)
    await stopChild(relayChild)
    throw error
  }

  return {
    appChild,
    relayChild,
    runtime,
  }
}

const launchStackWithRetries = async (lane) => {
  let lastError = null

  for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt += 1) {
    try {
      return await launchStackChildren(lane, {
        preferredAppPort: lane.preferredAppPort + attempt,
        preferredRelayPort: lane.preferredRelayPort + attempt,
      })
    } catch (error) {
      lastError = error
    }
  }

  throw lastError ?? new Error(`Could not start ${lane.description}.`)
}

const resolveLane = (laneId) => {
  const lane = laneDefinitions[laneId]
  if (!lane) {
    fail(`Unknown lane "${laneId}".`)
  }

  return lane
}

const startStack = async ({ laneId }) => {
  const lane = resolveLane(laneId)
  const { appChild, relayChild, runtime } = await launchStackWithRetries(lane)

  const lanIp = getLanIp()
  const networkAppUrl = lanIp ? `http://${lanIp}:${runtime.appPort}` : null

  process.stdout.write(
    [
      `${lane.description} ready`,
      `- app: ${runtime.appUrl}`,
      ...(networkAppUrl ? [`- app (network): ${networkAppUrl}`] : []),
      `- relay health: ${runtime.relayUrl}`,
      `- relay ws: ${runtime.relayWebSocketUrl}`,
      `- dist: ${runtime.distDir}`,
      `- report: ${runtime.reportDir}`,
      `- results: ${runtime.outputDir}`,
    ].join("\n") + "\n",
  )

  const children = [appChild, relayChild]
  let shuttingDown = false

  const shutdown = async (exitCode = 0) => {
    if (shuttingDown) {
      return
    }

    shuttingDown = true
    await Promise.all(children.map((child) => stopChild(child)))
    process.exit(exitCode)
  }

  const forwardSignal = () => {
    shutdown(0).catch((error) => {
      process.stderr.write(`${error.message}\n`)
      process.exit(1)
    })
  }

  process.on("SIGINT", forwardSignal)
  process.on("SIGTERM", forwardSignal)

  for (const child of children) {
    child.on("exit", (code, signal) => {
      if (shuttingDown) {
        return
      }

      const reason =
        signal !== null
          ? `Process exited with signal ${signal}`
          : `Process exited with code ${code ?? 0}`
      process.stderr.write(`${reason}\n`)
      shutdown(code ?? 1).catch((error) => {
        process.stderr.write(`${error.message}\n`)
        process.exit(1)
      })
    })
  }

  await new Promise(() => {})
}

const startManagedRuntime = async (laneId) => {
  const lane = resolveLane(laneId)
  const { appChild, relayChild, runtime } = await launchStackWithRetries(lane)
  writeLatestReportManifest(runtime)

  return {
    runtime,
    stop: async () => {
      await Promise.all([stopChild(appChild), stopChild(relayChild)])
    },
  }
}

const runPlaywright = async ({
  laneId,
  remote = false,
  passthroughArgs = [],
}) => {
  resolveLane(laneId)
  const lock = shouldAcquireManagedE2eLock(passthroughArgs)
    ? acquireManagedE2eLock({
        command: buildManagedE2eCommand({ remote, passthroughArgs }),
        laneId,
        mode: remote ? "remote" : "local",
        repoRoot,
      })
    : null
  const configPath = remote
    ? "playwright.remote.config.ts"
    : "playwright.config.ts"
  let managedRuntime = null

  try {
    managedRuntime = await startManagedRuntime(laneId)
    const runtime = managedRuntime.runtime

    process.stdout.write(
      `Playwright runtime: ${runtime.appUrl} with relay ${runtime.relayWebSocketUrl}\n`,
    )

    const child = spawn(
      nodeExec,
      [playwrightCliPath, "test", "--config", configPath, ...passthroughArgs],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          NEXT_PUBLIC_REMOTE_WS_URL: runtime.relayWebSocketUrl,
          PLAYWRIGHT_BASE_URL: runtime.appUrl,
          PLAYWRIGHT_MANAGED_RUNTIME: "1",
          PLAYWRIGHT_OUTPUT_DIR: runtime.outputDir,
          PLAYWRIGHT_NODE: nodeExec,
          PLAYWRIGHT_RELAY_URL: `http://${CONNECT_HOST}:${runtime.relayPort}`,
          PLAYWRIGHT_REPORT_DIR: runtime.reportDir,
        },
        stdio: "inherit",
      },
    )

    const result = await new Promise((resolve) => {
      child.on("exit", (code, signal) => {
        resolve({ code: code ?? 1, signal })
      })
    })

    if (result.signal) {
      process.kill(process.pid, result.signal)
      return
    }

    process.exitCode = result.code
  } finally {
    await managedRuntime?.stop()
    lock?.release()
  }
}

const showLatestReport = async () => {
  const reportDir = resolveReportDir()

  if (!reportDir) {
    fail(
      "No Playwright report directory was found. Run `pnpm test:e2e:*` first.",
    )
  }

  const child = spawn(nodeExec, [playwrightCliPath, "show-report", reportDir], {
    cwd: repoRoot,
    stdio: "inherit",
  })

  const exitCode = await new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal)
        return
      }

      resolve(code ?? 1)
    })
  })

  process.exit(exitCode)
}

const parseArgs = (rawArgs) => {
  const flags = new Map()
  const passthrough = []

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index]

    if (arg === "--") {
      continue
    }

    if (arg.startsWith("--lane=")) {
      flags.set("lane", arg.slice("--lane=".length))
      continue
    }

    if (arg === "--lane") {
      flags.set("lane", rawArgs[index + 1] ?? "")
      index += 1
      continue
    }

    if (arg === "--remote") {
      flags.set("remote", "true")
      continue
    }

    passthrough.push(arg)
  }

  return { flags, passthrough }
}

const main = async () => {
  const [command, ...rawArgs] = process.argv.slice(2)
  const { flags, passthrough } = parseArgs(rawArgs)

  switch (command) {
    case "start": {
      const laneId = flags.get("lane") || "dev"
      await startStack({ laneId })
      break
    }
    case "test": {
      const laneId = flags.get("lane") || "test"
      await runPlaywright({
        laneId,
        remote: flags.get("remote") === "true",
        passthroughArgs: passthrough,
      })
      break
    }
    case "report": {
      await showLatestReport()
      break
    }
    default:
      fail(
        [
          "Usage:",
          "  node scripts/runtime-lane.mjs start [--lane=dev|test]",
          "  node scripts/runtime-lane.mjs test [--lane=test] [--remote] [playwright args...]",
          "  node scripts/runtime-lane.mjs report",
        ].join("\n"),
      )
  }
}

try {
  await main()
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}
