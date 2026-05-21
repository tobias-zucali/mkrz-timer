import assert from "node:assert/strict"
import test from "node:test"

import type { SessionSnapshot } from "../../shared/remoteSession/types.ts"

import { selectLocalFallbackSnapshot } from "./fallback.ts"

const createSnapshot = (title: string): SessionSnapshot => ({
  params: {
    bg: "#000000",
    fg: "#ffffff",
    m: "01",
    pc: "#d61f69",
    s: "00",
    title,
  },
  state: {
    elapsedTime: 0,
    isPaused: true,
    isStarted: false,
    lastUpdatedAt: 0,
    revision: 0,
    totalDuration: 60,
  },
})

test("selectLocalFallbackSnapshot preserves pending local edits first", () => {
  const snapshot = selectLocalFallbackSnapshot({
    currentLocalSnapshot: createSnapshot("current"),
    lastConfirmedServerSnapshot: createSnapshot("server"),
    pendingLocalSnapshot: createSnapshot("pending-local"),
    pendingServerSnapshot: createSnapshot("pending-server"),
  })

  assert.equal(snapshot.params.title, "pending-local")
})

test("selectLocalFallbackSnapshot preserves the pending server snapshot before cleanup", () => {
  const snapshot = selectLocalFallbackSnapshot({
    currentLocalSnapshot: createSnapshot("current"),
    lastConfirmedServerSnapshot: createSnapshot("server"),
    pendingLocalSnapshot: null,
    pendingServerSnapshot: createSnapshot("pending-server"),
  })

  assert.equal(snapshot.params.title, "pending-server")
})

test("selectLocalFallbackSnapshot falls back to the last confirmed server snapshot", () => {
  const snapshot = selectLocalFallbackSnapshot({
    currentLocalSnapshot: createSnapshot("current"),
    lastConfirmedServerSnapshot: createSnapshot("server"),
    pendingLocalSnapshot: null,
    pendingServerSnapshot: null,
  })

  assert.equal(snapshot.params.title, "server")
})
