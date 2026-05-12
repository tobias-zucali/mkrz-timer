import assert from "node:assert/strict"
import { test } from "node:test"

import buildErrorReportBody from "./index.ts"

test("buildErrorReportBody includes expected diagnostics", () => {
  const report = buildErrorReportBody({
    errorText: "Remote mode could not start. Connection failed",
    floatingTimerErrorText: "Floating timer could not open.",
    remoteIdParam: "remote-123",
    peerId: "local-456",
    hostPeerId: "host-789",
    peerRole: "client",
    peerStatus: "disconnected",
    isReadonlyClient: true,
    statusModeLabel: "Control client",
    statusStateLabel: "Reconnect failed",
    statusDescription:
      "Automatic recovery could not restore control access yet.",
    statusRemoteModeLabel: "Recovery needs a retry",
    statusNetworkLabel: "Offline",
    statusPeerSessionLabel: "Joined peer",
    statusPeerServerReachabilityLabel: "Unreachable",
    connectionsCount: 2,
    connectionDetails: [
      {
        id: "conn-1",
        isAlive: false,
        isOpen: false,
        lastPing: 1234,
        webRtcConnectionState: "failed",
        webRtcIceConnectionState: "failed",
        webRtcSignalingState: "stable",
      },
    ],
    peerServerLabel: "PeerJS: localhost:9100",
    error: new Error("Connection failed"),
    params: { rid: "remote-123", control: "42", m: "01", s: "00" },
    isOnline: false,
    visibilityState: "hidden",
    hasFocus: false,
    peerEventTimeline: [
      "2026-05-05T21:30:00.000Z peer_open",
      "2026-05-05T21:30:01.000Z peer_error: Connection failed",
    ],
  })

  assert.ok(
    report.includes(
      "Status report: Remote mode could not start. Connection failed | Floating timer could not open.",
    ),
  )
  assert.ok(report.includes("- Mode: Control client"))
  assert.ok(report.includes("- State: Reconnect failed"))
  assert.ok(report.includes("- Remote mode: Recovery needs a retry"))
  assert.ok(
    report.includes(
      "- Description: Automatic recovery could not restore control access yet.",
    ),
  )
  assert.ok(report.includes("- Network: Offline"))
  assert.ok(report.includes("- Peer session: Joined peer"))
  assert.ok(report.includes("- Peer server reachability: Unreachable"))
  assert.ok(
    report.includes(
      "- Visible remote issue: Remote mode could not start. Connection failed",
    ),
  )
  assert.ok(
    report.includes(
      "- Visible floating timer issue: Floating timer could not open.",
    ),
  )
  assert.ok(report.includes("- Remote id param: remote-123"))
  assert.ok(report.includes("- Local peer id: local-456"))
  assert.ok(report.includes("- Host peer id: host-789"))
  assert.ok(report.includes("- Peer role: client"))
  assert.ok(report.includes("- Peer status: disconnected"))
  assert.ok(report.includes("- Readonly client: yes"))
  assert.ok(report.includes("- Active connections: 2"))
  assert.ok(report.includes('"webRtcConnectionState":"failed"'))
  assert.ok(report.includes("- Peer server: PeerJS: localhost:9100"))
  assert.ok(report.includes("- Raw error message: Connection failed"))
  assert.ok(report.includes("- URL: unavailable"))
  assert.ok(report.includes("- User agent:"))
  assert.ok(report.includes("- Browser online: false"))
  assert.ok(report.includes("- Visibility state: hidden"))
  assert.ok(report.includes("- Has focus: false"))
  assert.ok(report.includes("- Peer events (last 2):"))
  assert.ok(report.includes("- Query params snapshot:"))
})

test("buildErrorReportBody returns a status snapshot without visible errors", () => {
  const report = buildErrorReportBody({
    errorText: null,
    floatingTimerErrorText: null,
    peerRole: "client",
    peerStatus: "disconnected",
    isReadonlyClient: false,
    statusModeLabel: "Local timer",
    statusStateLabel: "Ready",
    statusDescription:
      "Remote mode is off. Open settings when you want to share the timer.",
    statusRemoteModeLabel: "Inactive",
    statusNetworkLabel: "Online",
    connectionsCount: 0,
    connectionDetails: [],
    peerServerLabel: "PeerJS",
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
  assert.ok(report.includes("- Peer session: inactive"))
  assert.ok(report.includes("- Peer server reachability: inactive"))
})
