import assert from "node:assert/strict"
import { test } from "node:test"

import getRemoteStatus from "./index.ts"

test("returns null outside remote mode", () => {
  assert.equal(
    getRemoteStatus({
      connectionDetails: [],
      connectionsCount: 0,
      hasConnectedOnce: false,
      isConnecting: false,
      remoteIdParam: "",
    }),
    null,
  )
})

test("describes the connected main host state", () => {
  const status = getRemoteStatus({
    connectionDetails: [{ isAlive: true }, { isAlive: true }],
    connectionsCount: 2,
    control: "42",
    hasConnectedOnce: true,
    isConnecting: false,
    peerId: "host-1",
    remoteIdParam: "host-1",
  })

  assert.deepEqual(status, {
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
    connectionDetails: [{ isAlive: true }],
    connectionsCount: 1,
    control: "42",
    hasConnectedOnce: true,
    isConnecting: false,
    peerId: "client-1",
    remoteIdParam: "host-1",
  })

  assert.deepEqual(status, {
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
    connectionDetails: [{ isAlive: true }],
    connectionsCount: 1,
    hasConnectedOnce: true,
    isConnecting: false,
    peerId: "viewer-1",
    remoteIdParam: "host-1",
  })

  assert.deepEqual(status, {
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
    connectionDetails: [],
    connectionsCount: 0,
    control: "42",
    hasConnectedOnce: true,
    isConnecting: true,
    remoteIdParam: "host-1",
  })

  assert.equal(status?.state, "reconnecting")
  assert.equal(status?.stateLabel, "Reconnecting")
  assert.equal(status?.connectionSummary, "Waiting for host connection")
})

test("describes degraded connections", () => {
  const status = getRemoteStatus({
    connectionDetails: [{ isAlive: true }, { isAlive: false }],
    connectionsCount: 2,
    control: "42",
    hasConnectedOnce: true,
    isConnecting: false,
    peerId: "host-1",
    remoteIdParam: "host-1",
  })

  assert.deepEqual(status, {
    connectionSummary: "1 of 2 peer links healthy",
    description: "Some connected peers are delayed or temporarily unavailable.",
    role: "main",
    roleLabel: "Main host",
    state: "degraded",
    stateLabel: "Degraded connection",
  })
})
