import type {
  LiveSessionStatusRole,
  LiveSessionStatusState,
} from "@/utils/liveSessionStatus"

export const ROLE_LABELS: Record<LiveSessionStatusRole, string> = {
  control: "Manage session",
  readonly: "Join session",
}

export const STATE_LABELS: Record<LiveSessionStatusState, string> = {
  connected: "Connected",
  connecting: "Connecting",
  failed: "Reconnect failed",
  recovered: "Recovered",
  reconnecting: "Reconnecting",
}

const DESCRIPTIONS: Record<
  LiveSessionStatusRole,
  Record<LiveSessionStatusState, string>
> = {
  control: {
    connected: "Can manage the shared timer and settings.",
    connecting: "Starting or joining the shared timer with manage access.",
    failed:
      "Automatic recovery could not restore manage access yet. Retry to rejoin the session.",
    recovered: "Connection recovered. Manage access is live again.",
    reconnecting:
      "Trying to reconnect to the shared timer with manage access.",
  },
  readonly: {
    connected: "Joined the shared timer without manage access.",
    connecting: "Joining the shared timer and waiting for the first sync.",
    failed:
      "Automatic recovery could not restore the join connection yet. Retry to request a fresh sync.",
    recovered: "Join connection recovered and the timer is live again.",
    reconnecting: "Trying to reconnect to the shared timer.",
  },
}

export function getConnectionSummary({
  hasControllingParticipant,
  hasReceivedInitialSync,
  participantCount,
  role,
  state,
}: {
  hasControllingParticipant: boolean
  hasReceivedInitialSync: boolean
  participantCount: number
  role: LiveSessionStatusRole
  state: LiveSessionStatusState
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
    if (!hasControllingParticipant) {
      return "Waiting for manager"
    }

    return otherParticipantCount > 0
      ? `Joined with ${otherParticipantCount} ${participantLabel}`
      : "Joined shared timer"
  }

  return otherParticipantCount > 0
    ? `Managing with ${otherParticipantCount} ${participantLabel}`
    : "Managing shared timer"
}

export function getDescription(
  role: LiveSessionStatusRole,
  state: LiveSessionStatusState,
  hasControllingParticipant: boolean,
) {
  if (
    role === "readonly" &&
    state === "connected" &&
    !hasControllingParticipant
  ) {
    return "Viewing the last shared timer state while waiting for a manager."
  }

  return DESCRIPTIONS[role][state]
}
