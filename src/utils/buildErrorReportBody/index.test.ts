import assert from "node:assert/strict"
import { test } from "node:test"

import buildErrorReportBody from "./index.ts"

test("buildErrorReportBody includes expected diagnostics", () => {
  const report = buildErrorReportBody({
    connectionCount: 2,
    connectionDetails: [
      {
        id: "client-1",
        isAlive: true,
      },
    ],
    errorText: "Remote mode could not start. Connection failed",
    floatingTimerErrorText: "Floating timer could not open.",
    remotePath: "/control/controller-123",
    sessionId: "session-123",
    participantRole: "readonly",
    participantStatus: "disconnected",
    isReadonlyClient: true,
    statusModeLabel: "Control session",
    statusStateLabel: "Reconnect failed",
    statusDescription:
      "Automatic recovery could not restore control access yet.",
    statusRemoteModeLabel: "Recovery needs a retry",
    statusNetworkLabel: "Offline",
    statusSessionLabel: "Control participant",
    relayReachabilityLabel: "Unreachable",
    relayLabel: "Relay: localhost:9100",
    error: new Error("Connection failed"),
    params: { title: "Workshop" },
    isOnline: false,
    visibilityState: "hidden",
    hasFocus: false,
    peerEventTimeline: [
      "2026-05-05T21:30:00.000Z socket_open",
      "2026-05-05T21:30:01.000Z relay_error: Connection failed",
    ],
  })

  assert.ok(
    report.includes(
      "Status report: Remote mode could not start. Connection failed | Floating timer could not open.",
    ),
  )
  assert.ok(report.includes("- Mode: Control session"))
  assert.ok(report.includes("- State: Reconnect failed"))
  assert.ok(report.includes("- Remote mode: Recovery needs a retry"))
  assert.ok(report.includes("- Session: Control participant"))
  assert.ok(report.includes("- Relay reachability: Unreachable"))
  assert.ok(report.includes("- Remote path: /control/controller-123"))
  assert.ok(report.includes("- Session id: session-123"))
  assert.ok(report.includes("- Participant role: readonly"))
  assert.ok(report.includes("- Active participants: 2"))
  assert.ok(report.includes("- Relay: Relay: localhost:9100"))
  assert.ok(report.includes("- Remote events (last 2):"))
})

test("buildErrorReportBody returns a status snapshot without visible errors", () => {
  const report = buildErrorReportBody({
    connectionCount: 0,
    connectionDetails: [],
    errorText: null,
    floatingTimerErrorText: null,
    participantRole: "control",
    participantStatus: "disconnected",
    isReadonlyClient: false,
    statusModeLabel: "Local timer",
    statusStateLabel: "Ready",
    statusDescription:
      "Remote mode is off. Open Share when you want to start a remote session.",
    statusRemoteModeLabel: "Inactive",
    statusNetworkLabel: "Online",
    relayLabel: "Relay: localhost:9100",
    params: {},
    isOnline: "unavailable",
    visibilityState: "unavailable",
    hasFocus: "unavailable",
    peerEventTimeline: [],
  })

  assert.ok(report.includes("Status report: No active issues visible."))
  assert.ok(report.includes("- Mode: Local timer"))
  assert.ok(report.includes("- State: Ready"))
  assert.ok(report.includes("- Remote mode: Inactive"))
  assert.ok(report.includes("- Session: inactive"))
  assert.ok(report.includes("- Relay reachability: inactive"))
})
