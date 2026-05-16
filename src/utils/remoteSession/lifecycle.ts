import type { RelaySessionState } from "@/shared/remoteSession/types"

export const AUTO_RECOVERY_TIMEOUT_MS = 18_000
export const HEARTBEAT_INTERVAL_MS = 10_000
export const RETRY_DELAY_MS = 1_000
export const RECOVERED_BADGE_TIMEOUT_MS = 4_000

export const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error))

export const handleSocketError = ({
  currentError,
}: {
  currentError: Error | null
}) =>
  currentError ??
  new Error(
    "Could not connect to the remote relay. Check the relay URL and try again.",
  )

export const handleSocketClose = ({
  hasConnectedOnce,
  isManualDisconnect,
  nextRemoteId,
  sessionId,
}: {
  hasConnectedOnce: boolean
  isManualDisconnect: boolean
  nextRemoteId?: string | null
  sessionId?: string
}):
  | {
      type: "manual-disconnect"
    }
  | {
      type: "failed-before-session"
      error: Error
    }
  | {
      type: "retry"
      error: Error | null
      lifecycleState: RelaySessionState
      retrySessionId: string
    } => {
  if (isManualDisconnect) {
    return {
      type: "manual-disconnect",
    }
  }

  if (!nextRemoteId && !sessionId) {
    return {
      type: "failed-before-session",
      error: new Error(
        "Remote relay connection closed before the session was ready.",
      ),
    }
  }

  return {
    type: "retry",
    error: hasConnectedOnce
      ? null
      : new Error(
          "Could not connect to the remote relay. Retrying automatically.",
        ),
    lifecycleState: hasConnectedOnce ? "reconnecting" : "connecting",
    retrySessionId: nextRemoteId || sessionId || "",
  }
}
