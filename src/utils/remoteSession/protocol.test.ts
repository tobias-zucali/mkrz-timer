import test from "node:test"
import assert from "node:assert/strict"

import {
  DEFAULT_SYNC_PARAMS,
  DEFAULT_TIMER_STATE,
} from "../../shared/security/input.ts"
import {
  buildHeartbeatMessage,
  buildJoinMessage,
  buildLeaveMessage,
  buildSyncMessage,
  parseServerMessage,
} from "./protocol.ts"

const syncParams = DEFAULT_SYNC_PARAMS

const syncState = DEFAULT_TIMER_STATE

test("buildJoinMessage creates a snapshot for session creators", () => {
  const message = buildJoinMessage({
    clientId: "client-1",
    retryType: "create-session",
    syncParams,
    syncState,
  })

  assert.equal(message.type, "create-session")
  assert.equal(message.clientId, "client-1")
  assert.deepEqual(message.snapshot.params, syncParams)
  assert.equal(message.snapshot.state.elapsedTime, syncState.elapsedTime)
  assert.equal(message.snapshot.state.isPaused, syncState.isPaused)
  assert.equal(message.snapshot.state.isStarted, syncState.isStarted)
  assert.equal(message.snapshot.state.revision, syncState.revision)
  assert.equal(message.snapshot.state.totalDuration, syncState.totalDuration)
  assert.ok(message.snapshot.state.lastUpdatedAt > 0)
})

test("buildJoinMessage only includes retry snapshots for control clients", () => {
  assert.deepEqual(
    buildJoinMessage({
      clientId: "viewer",
      remoteRole: "readonly",
      remoteToken: "viewer-token",
      retryType: "retry-join-session",
      syncParams,
      syncState,
    }),
    {
      clientId: "viewer",
      role: "readonly",
      snapshot: undefined,
      token: "viewer-token",
      type: "retry-join-session",
    },
  )

  const controlRetryMessage = buildJoinMessage({
    clientId: "viewer",
    remoteRole: "control",
    remoteToken: "control-token",
    retryType: "retry-join-session",
    syncParams,
    syncState,
  })

  assert.equal(controlRetryMessage.type, "retry-join-session")
  assert.equal(controlRetryMessage.clientId, "viewer")
  assert.equal(controlRetryMessage.role, "control")
  assert.equal(controlRetryMessage.token, "control-token")
  assert.deepEqual(controlRetryMessage.snapshot?.params, syncParams)
  assert.equal(
    controlRetryMessage.snapshot?.state.elapsedTime,
    syncState.elapsedTime,
  )
  assert.ok((controlRetryMessage.snapshot?.state.lastUpdatedAt ?? 0) > 0)
})

test("buildSyncMessage, buildHeartbeatMessage, and buildLeaveMessage preserve the protocol shape", () => {
  assert.deepEqual(
    buildSyncMessage({
      clientId: "host",
      params: { title: "Updated" },
      sessionId: "session-1",
      state: syncState,
    }),
    {
      type: "sync",
      clientId: "host",
      params: { title: "Updated" },
      sessionId: "session-1",
      state: syncState,
    },
  )

  assert.deepEqual(
    buildHeartbeatMessage({ clientId: "host", sessionId: "s1" }),
    {
      type: "heartbeat",
      clientId: "host",
      sessionId: "s1",
    },
  )

  assert.deepEqual(buildLeaveMessage({ clientId: "host", sessionId: "s1" }), {
    type: "leave",
    clientId: "host",
    sessionId: "s1",
  })
})

test("parseServerMessage rejects invalid JSON and returns typed messages", () => {
  assert.equal(
    parseServerMessage({ data: "nope" } as MessageEvent<string>),
    null,
  )

  assert.deepEqual(
    parseServerMessage({
      data: JSON.stringify({
        type: "error",
        message: "boom",
      }),
    } as MessageEvent<string>),
    {
      type: "error",
      message: "boom",
    },
  )

  assert.equal(
    parseServerMessage({
      data: JSON.stringify({
        type: "session",
        sessionId: "<bad>",
        participants: [],
        snapshot: {},
      }),
    } as MessageEvent<string>),
    null,
  )
})
