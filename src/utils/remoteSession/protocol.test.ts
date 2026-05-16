import test from "node:test"
import assert from "node:assert/strict"

import {
  buildHeartbeatMessage,
  buildJoinMessage,
  buildLeaveMessage,
  buildSyncMessage,
  parseServerMessage,
} from "./protocol.ts"

const syncParams = {
  bg: "#000000",
  fg: "#ffffff",
  m: "01",
  pc: "#d61f69",
  s: "00",
  title: "",
}

const syncState = {
  elapsedTime: 0,
  isPaused: true,
  isStarted: false,
  revision: 0,
  totalDuration: 60,
}

test("buildJoinMessage creates a snapshot for create-or-join clients", () => {
  assert.deepEqual(
    buildJoinMessage({
      canControlSession: false,
      clientId: "client-1",
      nextRemoteId: "session-1",
      retryType: "create-or-join",
      syncParams,
      syncState,
    }),
    {
      type: "create-or-join",
      canControl: false,
      clientId: "client-1",
      sessionId: "session-1",
      snapshot: {
        params: syncParams,
        state: syncState,
      },
    },
  )
})

test("buildJoinMessage only includes retry snapshots for control clients", () => {
  assert.deepEqual(
    buildJoinMessage({
      canControlSession: false,
      clientId: "viewer",
      nextRemoteId: "session-1",
      retryType: "retry-join",
      syncParams,
      syncState,
    }),
    {
      type: "retry-join",
      canControl: false,
      clientId: "viewer",
      sessionId: "session-1",
      snapshot: undefined,
    },
  )
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
