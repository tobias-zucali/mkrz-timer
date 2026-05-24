import type { RelaySessionState } from "@/shared/remoteSession/types"

export const AUTO_RECOVERY_TIMEOUT_MS = 18_000
export const HEARTBEAT_INTERVAL_MS = 10_000
export const RETRY_DELAY_MS = 1_000
export const RECOVERED_BADGE_TIMEOUT_MS = 4_000

export type RemoteSessionErrorKey =
  | "connectFailedDetail"
  | "closedBeforeReadyDetail"
  | "retryingAutomaticallyDetail"
  | "malformedLinkDetail"

type RemoteSessionError = Error & {
  translationKey?: RemoteSessionErrorKey
}

export function createRemoteSessionError(key: RemoteSessionErrorKey) {
  const error = new Error(key) as RemoteSessionError
  error.translationKey = key
  return error
}

export function getRemoteSessionErrorKey(error: Error | null | undefined) {
  return (error as RemoteSessionError | null)?.translationKey ?? null
}

export const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error))

export const handleSocketError = ({
  currentError,
}: {
  currentError: Error | null
}) => currentError ?? createRemoteSessionError("connectFailedDetail")

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
      error: createRemoteSessionError("closedBeforeReadyDetail"),
    }
  }

  return {
    type: "retry",
    error: hasConnectedOnce
      ? null
      : createRemoteSessionError("retryingAutomaticallyDetail"),
    lifecycleState: hasConnectedOnce ? "reconnecting" : "connecting",
    retrySessionId: nextRemoteId || sessionId || "",
  }
}
