type ConnectionDetail = {
  id: string
  isAlive: boolean
  isOpen?: boolean
  lastPing?: number
  webRtcConnectionState?: string
  webRtcIceConnectionState?: string
  webRtcSignalingState?: string
}

type BuildErrorReportBodyParams = {
  errorText: string | null
  remoteIdParam?: string
  peerId?: string
  hostPeerId?: string
  peerRole: "main" | "client"
  peerStatus: "connected" | "disconnected"
  isReadonlyClient: boolean
  connectionsCount: number
  connectionDetails: ConnectionDetail[]
  peerServerLabel: string
  error?: Error | null
  params: Record<string, string | null | undefined>
  isOnline: boolean | "unavailable"
  visibilityState: DocumentVisibilityState | "unavailable"
  hasFocus: boolean | "unavailable"
  peerEventTimeline: string[]
}

export default function buildErrorReportBody({
  errorText,
  remoteIdParam,
  peerId,
  hostPeerId,
  peerRole,
  peerStatus,
  isReadonlyClient,
  connectionsCount,
  connectionDetails,
  peerServerLabel,
  error,
  params,
  isOnline,
  visibilityState,
  hasFocus,
  peerEventTimeline,
}: BuildErrorReportBodyParams): string {
  if (!errorText) {
    return ""
  }

  const now =
    typeof window !== "undefined"
      ? new Date().toISOString()
      : new Date().toString()
  const location =
    typeof window !== "undefined" ? window.location.href : "unavailable"
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent : "unavailable"
  const timezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "unavailable"

  return [
    `Error: ${errorText}`,
    "",
    "Debug info:",
    `- Timestamp: ${now}`,
    `- URL: ${location}`,
    `- Remote id param: ${remoteIdParam ?? "none"}`,
    `- Local peer id: ${peerId ?? "none"}`,
    `- Host peer id: ${hostPeerId ?? "none"}`,
    `- Peer role: ${peerRole}`,
    `- Peer status: ${peerStatus}`,
    `- Readonly client: ${isReadonlyClient ? "yes" : "no"}`,
    `- Active connections: ${connectionsCount}`,
    `- Connection details: ${JSON.stringify(connectionDetails)}`,
    `- Peer server: ${peerServerLabel}`,
    `- Raw error message: ${error?.message ?? "none"}`,
    `- Raw error stack: ${error?.stack ?? "none"}`,
    `- User agent: ${userAgent}`,
    `- Browser online: ${isOnline}`,
    `- Visibility state: ${visibilityState}`,
    `- Has focus: ${hasFocus}`,
    `- Timezone: ${timezone}`,
    `- Query params snapshot: ${JSON.stringify(params)}`,
    `- Peer events (last ${peerEventTimeline.length}): ${JSON.stringify(peerEventTimeline)}`,
  ].join("\n")
}
