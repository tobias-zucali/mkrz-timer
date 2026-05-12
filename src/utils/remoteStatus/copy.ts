import type { RemoteStatusRole, RemoteStatusState } from "@/utils/remoteStatus"

export const ROLE_LABELS: Record<RemoteStatusRole, string> = {
  control: "Control session",
  readonly: "Readonly session",
}

export const STATE_LABELS: Record<RemoteStatusState, string> = {
  connected: "Connected",
  connecting: "Connecting",
  failed: "Reconnect failed",
  recovered: "Recovered",
  reconnecting: "Reconnecting",
}

const DESCRIPTIONS: Record<
  RemoteStatusRole,
  Record<RemoteStatusState, string>
> = {
  control: {
    connected: "Can control the shared timer and settings.",
    connecting: "Starting or joining the shared timer with control access.",
    failed:
      "Automatic recovery could not restore control access yet. Retry to rejoin the session.",
    recovered: "Connection recovered. Control access is live again.",
    reconnecting:
      "Trying to reconnect to the shared timer with control access.",
  },
  readonly: {
    connected: "Viewing the shared timer without controls.",
    connecting:
      "Joining the shared timer as a viewer and waiting for the first sync.",
    failed:
      "Automatic recovery could not restore the viewer connection yet. Retry to request a fresh sync.",
    recovered: "Viewer connection recovered and the timer is live again.",
    reconnecting: "Trying to reconnect to the shared timer view.",
  },
}

export function getConnectionSummary({
  hasReceivedInitialSync,
  participantCount,
  role,
  state,
}: {
  hasReceivedInitialSync: boolean
  participantCount: number
  role: RemoteStatusRole
  state: RemoteStatusState
}) {
  if (state === "connecting" || state === "reconnecting") {
    if (!hasReceivedInitialSync) {
      return "Waiting for timer sync"
    }

    return "Restoring relay connection"
  }

  if (state === "failed") {
    return "Recovery needs a retry"
  }

  const otherParticipantCount = Math.max(participantCount - 1, 0)
  const participantLabel =
    otherParticipantCount === 1 ? "other participant" : "other participants"

  if (role === "readonly") {
    return otherParticipantCount > 0
      ? `Viewing with ${otherParticipantCount} ${participantLabel}`
      : "Viewing shared timer"
  }

  return otherParticipantCount > 0
    ? `Controlling with ${otherParticipantCount} ${participantLabel}`
    : "Controlling shared timer"
}

export function getDescription(
  role: RemoteStatusRole,
  state: RemoteStatusState,
) {
  return DESCRIPTIONS[role][state]
}
