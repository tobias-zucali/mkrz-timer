import assert from "node:assert/strict"
import { test } from "vitest"

import {
  DEFAULT_SYNC_PARAMS,
  DEFAULT_TIMER_STATE,
} from "@/shared/security/input"
import type { SessionSnapshot } from "@/shared/liveSession/types"

import { selectLocalFallbackSnapshot } from "./fallback.ts"

const createSnapshot = (title: string): SessionSnapshot => ({
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
