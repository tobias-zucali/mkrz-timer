import assert from "node:assert/strict"
import { test } from "node:test"

import getRemoteStatus from "./index.ts"

test("returns null outside remote mode", () => {
  assert.equal(
    getRemoteStatus({
      canRetryManually: false,
      hasConnectedOnce: false,
      hasReceivedInitialSync: false,
      lifecycleState: "connecting",
      participantCount: 0,
      remoteIdParam: "",
    }),
    null,
  )
})

test("describes pending control-session startup before the session id exists", () => {
  const status = getRemoteStatus({
    canRetryManually: false,
    control: "42",
    hasConnectedOnce: false,
    hasReceivedInitialSync: false,
    lifecycleState: "connecting",
    participantCount: 1,
    showPendingHostStatus: true,
  })

  assert.deepEqual(status, {
    canRetryManually: false,
    connectionSummary: "Waiting for timer sync",
    description: "Starting or joining the shared timer with control access.",
    role: "control",
    roleLabel: "Control session",
    state: "connecting",
    stateLabel: "Connecting",
  })
})

test("describes the connected control-session state", () => {
  const status = getRemoteStatus({
    canRetryManually: false,
    control: "42",
    hasConnectedOnce: true,
    hasReceivedInitialSync: true,
    lifecycleState: "connected",
    participantCount: 3,
    remoteIdParam: "session-1",
  })

  assert.deepEqual(status, {
    canRetryManually: false,
    connectionSummary: "Controlling with 2 other participants",
    description: "Can control the shared timer and settings.",
    role: "control",
    roleLabel: "Control session",
    state: "connected",
    stateLabel: "Connected",
  })
})

test("describes a connected readonly session", () => {
  const status = getRemoteStatus({
    canRetryManually: false,
    hasConnectedOnce: true,
    hasReceivedInitialSync: true,
    lifecycleState: "connected",
    participantCount: 2,
    remoteIdParam: "session-1",
  })

  assert.deepEqual(status, {
    canRetryManually: false,
    connectionSummary: "Viewing with 1 other participant",
    description: "Viewing the shared timer without controls.",
    role: "readonly",
    roleLabel: "Readonly session",
    state: "connected",
    stateLabel: "Connected",
  })
})

test("describes a failed readonly recovery with retry available", () => {
  const status = getRemoteStatus({
    canRetryManually: true,
    hasConnectedOnce: true,
    hasReceivedInitialSync: false,
    lifecycleState: "failed",
    participantCount: 0,
    remoteIdParam: "session-1",
  })

  assert.deepEqual(status, {
    canRetryManually: true,
    connectionSummary: "Recovery needs a retry",
    description:
      "Automatic recovery could not restore the viewer connection yet. Retry to request a fresh sync.",
    role: "readonly",
    roleLabel: "Readonly session",
    state: "failed",
    stateLabel: "Reconnect failed",
  })
})
