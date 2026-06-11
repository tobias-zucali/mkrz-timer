import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import process from "node:process"
import { spawnSync } from "node:child_process"

const LOCK_ROOT = ".playwright-runs"
const LOCK_DIR = "managed-e2e.lock"
const LOCK_METADATA = "owner.json"
const HEARTBEAT_INTERVAL_MS = 5_000

/**
 * @typedef {{
 *   command?: string
 *   inspectProcess?: (owner: unknown) => { active: boolean, startTime?: string | null }
 *   laneId?: string
 *   mode?: string
 *   repoRoot: string
 * }} AcquireManagedE2eLockOptions
 */

const getLockPaths = (repoRoot) => {
  const lockRootPath = path.join(repoRoot, LOCK_ROOT)
  const lockDirPath = path.join(lockRootPath, LOCK_DIR)

  return {
    lockRootPath,
    lockDirPath,
    metadataPath: path.join(lockDirPath, LOCK_METADATA),
  }
}

const readJsonFile = (filePath) => {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"))
  } catch {
    return null
  }
}

const getProcessStartTime = (pid) => {
  const result = spawnSync("ps", ["-p", `${pid}`, "-o", "lstart="], {
    encoding: "utf8",
  })

  if (result.error || result.status !== 0) {
    return null
  }

  const value = result.stdout.trim()
  return value.length > 0 ? value : null
}

const inspectLockOwnerProcess = (owner) => {
  if (!owner || typeof owner.pid !== "number" || owner.pid <= 0) {
    return { active: false }
  }

  try {
    process.kill(owner.pid, 0)
  } catch {
    return { active: false }
  }

  const startTime = getProcessStartTime(owner.pid)
  if (owner.startedAt && startTime && owner.startedAt !== startTime) {
    return { active: false }
  }

  return {
    active: true,
    startTime,
  }
}

const formatExistingOwner = (owner) => {
  if (!owner) {
    return ""
  }

  const details = []
  if (typeof owner.pid === "number") {
    details.push(`pid ${owner.pid}`)
  }
  if (typeof owner.mode === "string") {
    details.push(`${owner.mode} mode`)
  }
  if (typeof owner.createdAt === "string") {
    details.push(`started ${owner.createdAt}`)
  }

  return details.length > 0 ? ` (${details.join(", ")})` : ""
}

/**
 * @param {unknown} owner
 */
export const buildManagedE2eLockMessage = (owner) =>
  [
    `Another managed E2E test run is already active${formatExistingOwner(owner)}.`,
    "Parallel E2E runs that start the managed Playwright runtime are intentionally blocked.",
    "`pnpm test:e2e:ui` may run in parallel because it does not take this exclusive lock.",
    "Wait for the running E2E command to finish before retrying.",
  ].join("\n")

/**
 * @param {string[]} [passthroughArgs]
 */
export const shouldAcquireManagedE2eLock = (passthroughArgs = []) =>
  !passthroughArgs.some((arg) => arg === "--ui")

const writeLockMetadata = (metadataPath, owner) => {
  writeFileSync(metadataPath, JSON.stringify(owner, null, 2) + "\n")
}

const createLockOwner = ({ command, laneId, mode, repoRoot }) => ({
  command,
  createdAt: new Date().toISOString(),
  heartbeatAt: new Date().toISOString(),
  laneId,
  mode,
  pid: process.pid,
  repoRoot,
  startedAt: getProcessStartTime(process.pid),
})

/**
 * @param {AcquireManagedE2eLockOptions} options
 */
export const acquireManagedE2eLock = ({
  command = "pnpm test:e2e:local",
  inspectProcess = inspectLockOwnerProcess,
  laneId = "test",
  mode = "local",
  repoRoot,
}) => {
  if (!repoRoot) {
    throw new Error("repoRoot is required to acquire the managed E2E lock.")
  }

  const { lockRootPath, lockDirPath, metadataPath } = getLockPaths(repoRoot)
  const owner = createLockOwner({ command, laneId, mode, repoRoot })
  mkdirSync(lockRootPath, { recursive: true })

  while (true) {
    try {
      mkdirSync(lockDirPath)
      writeLockMetadata(metadataPath, owner)
      break
    } catch (error) {
      if (error?.code !== "EEXIST") {
        throw error
      }

      const existingOwner = readJsonFile(metadataPath)
      const status = inspectProcess(existingOwner)
      if (status.active) {
        throw new Error(buildManagedE2eLockMessage(existingOwner))
      }

      rmSync(lockDirPath, { force: true, recursive: true })
    }
  }

  const heartbeat = setInterval(() => {
    writeLockMetadata(metadataPath, {
      ...owner,
      heartbeatAt: new Date().toISOString(),
    })
  }, HEARTBEAT_INTERVAL_MS)
  heartbeat.unref?.()

  let released = false

  return {
    owner,
    release() {
      if (released) {
        return
      }

      released = true
      clearInterval(heartbeat)
      rmSync(lockDirPath, { force: true, recursive: true })
    },
  }
}
