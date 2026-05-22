type ConnectionDetail = {
  id: string
  isAlive: boolean
}

type BuildErrorReportBodyParams = {
  connectionCount: number
  connectionDetails: ConnectionDetail[]
  errorText: string | null
  floatingTimerErrorText?: string | null
  remotePath?: string
  sessionId?: string
  participantRole: "control" | "readonly"
  participantStatus: "connected" | "disconnected"
  isReadonlyClient: boolean
  statusModeLabel: string
  statusStateLabel: string
  statusDescription: string
  statusRemoteModeLabel: string
  statusNetworkLabel: string
  statusSessionLabel?: string
  relayReachabilityLabel?: string
  relayLabel: string
  error?: Error | null
  params: Record<string, unknown>
  isOnline: boolean | "unavailable"
  visibilityState: DocumentVisibilityState | "unavailable"
  hasFocus: boolean | "unavailable"
  peerEventTimeline: string[]
}

export default function buildErrorReportBody({
  connectionCount,
  connectionDetails,
  errorText,
  floatingTimerErrorText,
  remotePath,
  sessionId,
  participantRole,
  participantStatus,
  isReadonlyClient,
  statusModeLabel,
  statusStateLabel,
  statusDescription,
  statusRemoteModeLabel,
  statusNetworkLabel,
  statusSessionLabel,
  relayReachabilityLabel,
  relayLabel,
  error,
  params,
  isOnline,
  visibilityState,
  hasFocus,
  peerEventTimeline,
}: BuildErrorReportBodyParams): string {
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
  const visibleIssueSummary = [errorText, floatingTimerErrorText]
    .filter(Boolean)
    .join(" | ")

  return [
    `Status report: ${visibleIssueSummary || "No active issues visible."}`,
    "",
    "Status snapshot:",
    `- Mode: ${statusModeLabel}`,
    `- State: ${statusStateLabel}`,
    `- Live session: ${statusRemoteModeLabel}`,
    `- Description: ${statusDescription}`,
    `- Network: ${statusNetworkLabel}`,
    `- Session: ${statusSessionLabel ?? "inactive"}`,
    `- Relay reachability: ${relayReachabilityLabel ?? "inactive"}`,
    `- Visible remote issue: ${errorText ?? "none"}`,
    `- Visible floating timer issue: ${floatingTimerErrorText ?? "none"}`,
    "",
    "Debug info:",
    `- Timestamp: ${now}`,
    `- URL: ${location}`,
    `- Remote path: ${remotePath ?? "none"}`,
    `- Session id: ${sessionId ?? "none"}`,
    `- Participant role: ${participantRole}`,
    `- Participant status: ${participantStatus}`,
    `- Readonly client: ${isReadonlyClient ? "yes" : "no"}`,
    `- Active participants: ${connectionCount}`,
    `- Participant details: ${JSON.stringify(connectionDetails)}`,
    `- Relay: ${relayLabel}`,
    `- Raw error message: ${error?.message ?? "none"}`,
    `- Raw error stack: ${error?.stack ?? "none"}`,
    `- User agent: ${userAgent}`,
    `- Browser online: ${isOnline}`,
    `- Visibility state: ${visibilityState}`,
    `- Has focus: ${hasFocus}`,
    `- Timezone: ${timezone}`,
    `- Query params snapshot: ${JSON.stringify(params)}`,
    `- Remote events (last ${peerEventTimeline.length}): ${JSON.stringify(peerEventTimeline)}`,
  ].join("\n")
}
