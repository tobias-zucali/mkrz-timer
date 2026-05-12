import assert from "node:assert/strict"
import { test } from "node:test"

import getRemoteStatus from "./index.ts"

const baseArgs = {
  canRetryManually: false,
  connectionDetails: [],
  connectionsCount: 0,
  hasConnectedOnce: false,
  hasReceivedInitialSync: false,
  isHostingSession: false,
  lifecycleState: "connecting" as const,
}

test("returns null outside remote mode", () => {
  assert.equal(
    getRemoteStatus({
      ...baseArgs,
      remoteIdParam: "",
    }),
    null,
  )
})

test("describes pending host startup before the remote id exists", () => {
  const status = getRemoteStatus({
    ...baseArgs,
    control: "42",
    isHostingSession: true,
    showPendingHostStatus: true,
  })

  assert.deepEqual(status, {
    canRetryManually: false,
    connectionSummary: "Starting host session",
    description: "Starting the remote session.",
    role: "main",
    roleLabel: "Main host",
    state: "connecting",
    stateLabel: "Connecting",
  })
})

test("describes the connected main host state", () => {
  const status = getRemoteStatus({
    ...baseArgs,
    connectionDetails: [{ isAlive: true }, { isAlive: true }],
    connectionsCount: 2,
    control: "42",
    hasConnectedOnce: true,
    hasReceivedInitialSync: true,
    lifecycleState: "connected",
    isHostingSession: true,
    peerId: "host-1",
    remoteIdParam: "session-1",
  })

  assert.deepEqual(status, {
    canRetryManually: false,
    connectionSummary: "2 connected peers",
    description: "Hosting the remote timer session.",
    role: "main",
    roleLabel: "Main host",
    state: "connected",
    stateLabel: "Connected",
  })
})

test("describes a connected control client", () => {
  const status = getRemoteStatus({
    ...baseArgs,
    connectionDetails: [{ isAlive: true }],
    connectionsCount: 1,
    control: "42",
    hasConnectedOnce: true,
    hasReceivedInitialSync: true,
    lifecycleState: "connected",
    isHostingSession: false,
    peerId: "client-1",
    remoteIdParam: "session-1",
  })

  assert.deepEqual(status, {
    canRetryManually: false,
    connectionSummary: "Connected to host",
    description: "Can control the shared timer and settings.",
    role: "control-client",
    roleLabel: "Control client",
    state: "connected",
    stateLabel: "Connected",
  })
})

test("describes a connected readonly client", () => {
  const status = getRemoteStatus({
    ...baseArgs,
    connectionDetails: [{ isAlive: true }],
    connectionsCount: 1,
    hasConnectedOnce: true,
    hasReceivedInitialSync: true,
    lifecycleState: "connected",
    isHostingSession: false,
    peerId: "viewer-1",
    remoteIdParam: "session-1",
  })

  assert.deepEqual(status, {
    canRetryManually: false,
    connectionSummary: "Connected to host",
    description: "Viewing the shared timer without controls.",
    role: "readonly-client",
    roleLabel: "Readonly client",
    state: "connected",
    stateLabel: "Connected",
  })
})

test("describes reconnecting after a prior connection", () => {
  const status = getRemoteStatus({
    ...baseArgs,
    control: "42",
    hasConnectedOnce: true,
    hasReceivedInitialSync: false,
    isHostingSession: false,
    lifecycleState: "reconnecting",
    remoteIdParam: "session-1",
  })

  assert.equal(status?.state, "reconnecting")
  assert.equal(status?.stateLabel, "Reconnecting")
  assert.equal(status?.connectionSummary, "Waiting for timer sync")
})

test("describes degraded connections", () => {
  const status = getRemoteStatus({
    ...baseArgs,
    connectionDetails: [{ isAlive: true }, { isAlive: false }],
    connectionsCount: 2,
    control: "42",
    hasConnectedOnce: true,
    hasReceivedInitialSync: true,
    lifecycleState: "connected",
    isHostingSession: true,
    peerId: "host-1",
    remoteIdParam: "session-1",
  })

  assert.deepEqual(status, {
    canRetryManually: false,
    connectionSummary: "1 of 2 peer links healthy",
    description: "Some connected peers are delayed or temporarily unavailable.",
    role: "main",
    roleLabel: "Main host",
    state: "degraded",
    stateLabel: "Degraded connection",
  })
})

test("describes a failed readonly recovery with retry available", () => {
  const status = getRemoteStatus({
    ...baseArgs,
    canRetryManually: true,
    hasConnectedOnce: true,
    hasReceivedInitialSync: false,
    lifecycleState: "failed",
    isHostingSession: false,
    peerId: "viewer-1",
    remoteIdParam: "session-1",
  })

  assert.deepEqual(status, {
    canRetryManually: true,
    connectionSummary: "Recovery needs a retry",
    description:
      "Automatic recovery could not restore the viewer connection. Retry to request a fresh sync.",
    role: "readonly-client",
    roleLabel: "Readonly client",
    state: "failed",
    stateLabel: "Reconnect failed",
  })
})
