import assert from "node:assert/strict"
import test from "node:test"

import {
  resolveSessionSnapshotAt,
  resolveTimerStateAt,
  sessionSnapshotsMatch,
  stampTimerStateAt,
} from "./index.ts"

test("resolveTimerStateAt advances running timers by wall-clock delta", () => {
  const resolved = resolveTimerStateAt(
    {
      elapsedTime: 12,
      isPaused: false,
      isStarted: true,
      lastUpdatedAt: 1_000,
      revision: 3,
      totalDuration: 60,
    },
    4_000,
  )

  assert.equal(resolved.elapsedTime, 15)
})

test("resolveSessionSnapshotAt preserves paused timers without adding elapsed time", () => {
  const resolved = resolveSessionSnapshotAt(
    {
      params: {
        bg: "#000000",
        fg: "#ffffff",
        m: "01",
        pc: "#d61f69",
        s: "00",
        title: "Paused",
      },
      state: {
        elapsedTime: 8,
        isPaused: true,
        isStarted: true,
        lastUpdatedAt: 1_000,
        revision: 3,
        totalDuration: 60,
      },
    },
    10_000,
  )

  assert.equal(resolved.state.elapsedTime, 8)
})

test("stampTimerStateAt refreshes the timestamp with the resolved current state", () => {
  const stamped = stampTimerStateAt(
    {
      elapsedTime: 5,
      isPaused: false,
      isStarted: true,
      lastUpdatedAt: 2_000,
      revision: 1,
      totalDuration: 60,
    },
    6_000,
  )

  assert.equal(stamped.elapsedTime, 9)
  assert.equal(stamped.lastUpdatedAt, 6_000)
})

test("sessionSnapshotsMatch compares resolved current running state instead of stale stored elapsed values", () => {
  const currentSnapshot = {
    params: {
      bg: "#000000",
      fg: "#ffffff",
      m: "01",
      pc: "#d61f69",
      s: "00",
      title: "Workshop",
    },
    state: {
      elapsedTime: 5,
      isPaused: false,
      isStarted: true,
      lastUpdatedAt: 2_000,
      revision: 1,
      totalDuration: 60,
    },
  }
  const incomingSnapshot = {
    params: currentSnapshot.params,
    state: {
      elapsedTime: 7,
      isPaused: false,
      isStarted: true,
      lastUpdatedAt: 4_000,
      revision: 2,
      totalDuration: 60,
    },
  }

  assert.equal(
    sessionSnapshotsMatch({
      currentSnapshot,
      incomingSnapshot,
      now: 7_000,
    }),
    true,
  )
})
