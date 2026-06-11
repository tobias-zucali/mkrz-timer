import assert from "node:assert/strict"
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

import {
  acquireManagedE2eLock,
  buildManagedE2eLockMessage,
  shouldAcquireManagedE2eLock,
} from "../../scripts/lib/e2e-runtime-lock.mjs"

const createTempRepoRoot = () =>
  mkdtempSync(path.join(os.tmpdir(), "e2e-lock-"))

test("second managed E2E run fails while the lock is active", () => {
  const repoRoot = createTempRepoRoot()

  try {
    const lock = acquireManagedE2eLock({ repoRoot })

    assert.throws(
      () => acquireManagedE2eLock({ repoRoot }),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(
          error.message,
          /Another managed E2E test run is already active/,
        )
        assert.match(
          error.message,
          /Parallel E2E runs that start the managed Playwright runtime are intentionally blocked/,
        )
        assert.match(error.message, /pnpm test:e2e:ui/)
        assert.match(
          error.message,
          /Wait for the running E2E command to finish before retrying/,
        )
        return true
      },
    )

    lock.release()
  } finally {
    rmSync(repoRoot, { force: true, recursive: true })
  }
})

test("stale locks are safely replaced without interrupting active processes", () => {
  const repoRoot = createTempRepoRoot()
  const lockDirPath = path.join(
    repoRoot,
    ".playwright-runs",
    "managed-e2e.lock",
  )
  const metadataPath = path.join(lockDirPath, "owner.json")

  try {
    mkdirSync(lockDirPath, { recursive: true })
    writeFileSync(
      metadataPath,
      JSON.stringify(
        {
          pid: 999_999,
          startedAt: "Mon Jan  1 00:00:00 2024",
        },
        null,
        2,
      ) + "\n",
    )

    const lock = acquireManagedE2eLock({
      repoRoot,
      inspectProcess: () => ({ active: false }),
    })

    const owner = JSON.parse(readFileSync(metadataPath, "utf8"))
    assert.equal(owner.pid, process.pid)
    assert.equal(lock.owner.pid, process.pid)

    lock.release()
  } finally {
    rmSync(repoRoot, { force: true, recursive: true })
  }
})

test("UI E2E mode is exempt from the exclusive managed lock", () => {
  assert.equal(shouldAcquireManagedE2eLock(["--ui"]), false)
  assert.equal(shouldAcquireManagedE2eLock(["--grep", "@smoke"]), true)
})

test("managed E2E lock message stays actionable", () => {
  const message = buildManagedE2eLockMessage({ pid: 1234, mode: "remote" })

  assert.match(message, /already active/)
  assert.match(message, /intentionally blocked/)
  assert.match(message, /pnpm test:e2e:ui/)
  assert.match(message, /finish before retrying/)
})
