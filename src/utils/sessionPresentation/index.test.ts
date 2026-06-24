import assert from "node:assert/strict"
import { test } from "node:test"

import {
  createAppTranslator,
  type AppTranslationFn,
} from "../../i18n/translator.ts"

import getSessionPresentation from "./index.ts"

const t = createAppTranslator() as AppTranslationFn

function buildRemoteStatus(
  overrides: Partial<Parameters<typeof getSessionPresentation>[0]> & {
    hasControllingParticipant?: boolean
    role?: "control" | "readonly"
    state?: "connected" | "connecting" | "failed" | "recovered" | "reconnecting"
  } = {},
) {
  return {
    canRetryManually: false,
    connectionSummary: "unused",
    description: "unused",
    hasControllingParticipant: overrides.hasControllingParticipant ?? true,
    role: overrides.role ?? "control",
    roleLabel: "unused",
    state: overrides.state ?? "connected",
    stateLabel: "unused",
  }
}

test("maps the default local state to private labels", () => {
  const presentation = getSessionPresentation({
    hasPendingSyncConflict: false,
    hasRecentlyEndedSession: false,
    isOnline: true,
    relayReachability: "checking",
    remoteStatus: null,
    t,
  })

  assert.equal(presentation.state, "local")
  assert.equal(presentation.runtimeBadgeLabel, "Private")
  assert.deepEqual(presentation.sidebarStatus, {
    eyebrow: "LOCAL",
    label: "Private session",
  })
})

test("maps a pending host connection to liveConnecting", () => {
  const presentation = getSessionPresentation({
    hasPendingSyncConflict: false,
    hasRecentlyEndedSession: false,
    isOnline: true,
    relayReachability: "checking",
    remoteStatus: buildRemoteStatus({ state: "connecting" }),
    t,
  })

  assert.equal(presentation.state, "liveConnecting")
  assert.equal(presentation.statusPanel.stateLabel, "Connecting...")
  assert.deepEqual(presentation.sharePanel.bullets, [
    "Preparing separate join and manage links",
    "Switching this timer to its manage link",
  ])
})

test("maps a connected control session to connected live labels", () => {
  const presentation = getSessionPresentation({
    hasPendingSyncConflict: false,
    hasRecentlyEndedSession: false,
    isOnline: true,
    relayReachability: "reachable",
    remoteStatus: buildRemoteStatus({ role: "control", state: "connected" }),
    t,
  })

  assert.equal(presentation.state, "liveConnected")
  assert.equal(presentation.roleChipLabel, "MANAGE")
  assert.equal(presentation.sidebarStatus.label, "Synchronized")
})

test("maps a connected readonly session without a controller to warning labels", () => {
  const presentation = getSessionPresentation({
    hasPendingSyncConflict: false,
    hasRecentlyEndedSession: false,
    isOnline: true,
    relayReachability: "reachable",
    remoteStatus: buildRemoteStatus({
      hasControllingParticipant: false,
      role: "readonly",
      state: "connected",
    }),
    t,
  })

  assert.equal(presentation.state, "liveConnected")
  assert.equal(presentation.isWaitingForController, true)
  assert.equal(presentation.runtimeBadgeLabel, "Waiting")
  assert.equal(presentation.sidebarStatus.label, "Waiting for manager")
  assert.equal(
    presentation.statusPanel.description,
    "The last manage client left this live session. You can keep waiting for a manager to return or switch this joined client to a private local timer.",
  )
})

test("maps reconnecting live state", () => {
  const presentation = getSessionPresentation({
    hasPendingSyncConflict: false,
    hasRecentlyEndedSession: false,
    isOnline: true,
    relayReachability: "reachable",
    remoteStatus: buildRemoteStatus({ state: "reconnecting" }),
    t,
  })

  assert.equal(presentation.state, "liveReconnecting")
  assert.equal(presentation.statusPanel.stateLabel, "Reconnecting...")
})

test("maps retry-needed recovery to error state labels", () => {
  const presentation = getSessionPresentation({
    hasPendingSyncConflict: false,
    hasRecentlyEndedSession: false,
    isOnline: true,
    relayReachability: "reachable",
    remoteStatus: buildRemoteStatus({ role: "readonly", state: "failed" }),
    t,
  })

  assert.equal(presentation.state, "liveConflict")
  assert.equal(presentation.runtimeBadgeLabel, "Error")
  assert.equal(presentation.statusPanel.accessLabel, "Join access")
})

test("maps active offline interruption to liveOffline", () => {
  const presentation = getSessionPresentation({
    hasPendingSyncConflict: false,
    hasRecentlyEndedSession: false,
    isOnline: false,
    relayReachability: "unreachable",
    remoteStatus: buildRemoteStatus({ state: "connected" }),
    t,
  })

  assert.equal(presentation.state, "liveOffline")
  assert.equal(presentation.statusPanel.stateLabel, "Disconnected")
  assert.equal(presentation.runtimeBadgeLabel, "Disconnected")
})

test("maps an explicitly ended session to liveEnded", () => {
  const presentation = getSessionPresentation({
    hasPendingSyncConflict: false,
    hasRecentlyEndedSession: true,
    isOnline: true,
    relayReachability: "checking",
    remoteStatus: null,
    t,
  })

  assert.equal(presentation.state, "liveEnded")
  assert.deepEqual(presentation.sidebarStatus, {
    eyebrow: "LOCAL",
    label: "Private session",
  })
  assert.equal(presentation.runtimeBadgeLabel, "Private")
  assert.equal(presentation.statusPanel.stateLabel, "Private")
})
