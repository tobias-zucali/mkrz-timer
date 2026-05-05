import assert from "node:assert/strict"
import { test } from "node:test"

import buildErrorReportBody from "./index.ts"

test("buildErrorReportBody includes expected diagnostics", () => {
  const report = buildErrorReportBody({
    errorText: "Remote mode could not start. Connection failed",
    remoteIdParam: "remote-123",
    peerId: "local-456",
    hostPeerId: "host-789",
    peerRole: "client",
    peerStatus: "disconnected",
    isReadonlyClient: true,
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

  assert.ok(report.includes("Error: Remote mode could not start. Connection failed"))
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

test("buildErrorReportBody returns empty text without visible error", () => {
  const report = buildErrorReportBody({
    errorText: null,
    peerRole: "client",
    peerStatus: "disconnected",
    isReadonlyClient: false,
    connectionsCount: 0,
    connectionDetails: [],
    peerServerLabel: "PeerJS",
    params: {},
    isOnline: "unavailable",
    visibilityState: "unavailable",
    hasFocus: "unavailable",
    peerEventTimeline: [],
  })

  assert.equal(report, "")
})
