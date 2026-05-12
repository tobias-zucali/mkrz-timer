import assert from "node:assert/strict"
import { test } from "node:test"

import {
  claimSession,
  createSession,
  getSession,
  heartbeatSession,
} from "./index.ts"
import { SessionDirectoryError } from "@/utils/remoteSession/types"

test("creates and resolves a remote session", () => {
  const sessionId = `session-${crypto.randomUUID()}`
  const created = createSession({
    ownerClientId: "client-a",
    ownerPeerId: "peer-a",
    sessionId,
  })

  assert.equal(created.sessionId, sessionId)
  assert.equal(created.ownerPeerId, "peer-a")
  assert.equal(created.epoch, 0)

  const resolved = getSession(sessionId)
  assert.equal(resolved.ownerClientId, "client-a")
  assert.equal(resolved.ownerPeerId, "peer-a")
})

test("rejects stale claim epochs", () => {
  const sessionId = `session-${crypto.randomUUID()}`
  const created = createSession({
    ownerClientId: "client-a",
    ownerPeerId: "peer-a",
    sessionId,
  })

  const claimed = claimSession({
    expectedEpoch: created.epoch,
    ownerClientId: "client-b",
    ownerPeerId: "peer-b",
    peers: [
      { canControl: true, clientId: "client-a", peerId: "peer-a" },
      { canControl: true, clientId: "client-b", peerId: "peer-b" },
    ],
    sessionId,
  })

  assert.equal(claimed.epoch, 1)

  assert.throws(
    () =>
      claimSession({
        expectedEpoch: created.epoch,
        ownerClientId: "client-c",
        ownerPeerId: "peer-c",
        peers: [{ canControl: true, clientId: "client-c", peerId: "peer-c" }],
        sessionId,
      }),
    (error: unknown) =>
      error instanceof SessionDirectoryError &&
      error.code === "epoch_conflict" &&
      error.currentSession?.ownerPeerId === "peer-b",
  )
})

test("heartbeat extends the lease for the active owner", () => {
  const sessionId = `session-${crypto.randomUUID()}`
  const created = createSession({
    ownerClientId: "client-a",
    ownerPeerId: "peer-a",
    sessionId,
  })

  const heartbeated = heartbeatSession({
    epoch: created.epoch,
    ownerClientId: created.ownerClientId,
    ownerPeerId: created.ownerPeerId,
    sessionId,
  })

  assert.ok(heartbeated.leaseExpiresAt >= created.leaseExpiresAt)
})
