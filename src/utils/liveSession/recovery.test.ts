import assert from "node:assert/strict"
import { test } from "vitest"

import {
  DEFAULT_SYNC_PARAMS,
  DEFAULT_TIMER_STATE,
} from "@/shared/security/input"
import type { SessionSnapshot } from "@/shared/liveSession/types"

import { decideSnapshotRecovery } from "./recovery.ts"

const createSnapshot = ({
  elapsedSecondsAtAnchor = 0,
  status = "idle",
  title = "Baseline",
}: {
  elapsedSecondsAtAnchor?: number
  status?: SessionSnapshot["state"]["status"]
  title?: string
} = {}): SessionSnapshot => ({
  params: {
    ...DEFAULT_SYNC_PARAMS,
    rows: [
      {
        ...DEFAULT_SYNC_PARAMS.rows[0],
        title,
      },
    ],
    title,
  },
  state: {
    ...DEFAULT_TIMER_STATE,
    elapsedSecondsAtAnchor,
    elapsedTime: elapsedSecondsAtAnchor,
    isPaused: status !== "running",
    isStarted: status !== "idle",
    status,
  },
})

test("decideSnapshotRecovery accepts unchanged snapshots silently", () => {
  const baseline = createSnapshot()

  assert.deepEqual(
    decideSnapshotRecovery({
      baselineSnapshot: baseline,
      localSnapshot: baseline,
      serverSnapshot: baseline,
    }),
    {
      localChanged: false,
      resolution: "accept-server",
      serverChanged: false,
    },
  )
})

test("decideSnapshotRecovery prefers local changes when the relay stayed unchanged", () => {
  const baseline = createSnapshot()
  const local = createSnapshot({ title: "Local override" })

  assert.deepEqual(
    decideSnapshotRecovery({
      baselineSnapshot: baseline,
      localSnapshot: local,
      serverSnapshot: baseline,
    }),
    {
      localChanged: true,
      resolution: "accept-local",
      serverChanged: false,
    },
  )
})

test("decideSnapshotRecovery prefers relay changes when the client stayed unchanged", () => {
  const baseline = createSnapshot()
  const server = createSnapshot({ title: "Relay override" })

  assert.deepEqual(
    decideSnapshotRecovery({
      baselineSnapshot: baseline,
      localSnapshot: baseline,
      serverSnapshot: server,
    }),
    {
      localChanged: false,
      resolution: "accept-server",
      serverChanged: true,
    },
  )
})

test("decideSnapshotRecovery requires a conflict decision when both sides changed", () => {
  const baseline = createSnapshot()
  const local = createSnapshot({ title: "Local override" })
  const server = createSnapshot({ status: "finished" })

  assert.deepEqual(
    decideSnapshotRecovery({
      baselineSnapshot: baseline,
      localSnapshot: local,
      serverSnapshot: server,
    }),
    {
      localChanged: true,
      resolution: "conflict",
      serverChanged: true,
    },
  )
})

test("decideSnapshotRecovery accepts converged snapshots after both sides changed", () => {
  const baseline = createSnapshot({
    elapsedSecondsAtAnchor: 12,
    status: "running",
  })
  const local = createSnapshot({ elapsedSecondsAtAnchor: 14, status: "paused" })
  const server = createSnapshot({
    elapsedSecondsAtAnchor: 14,
    status: "paused",
  })

  assert.deepEqual(
    decideSnapshotRecovery({
      baselineSnapshot: baseline,
      localSnapshot: local,
      serverSnapshot: server,
    }),
    {
      localChanged: true,
      resolution: "accept-server",
      serverChanged: true,
    },
  )
})
