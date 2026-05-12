import {
  SessionDirectoryError,
  type SessionMetadata,
} from "@/utils/remoteSession/types"

const getSessionRoute = (sessionId: string) =>
  `/api/remote-sessions/${encodeURIComponent(sessionId)}`

async function readSessionResponse(response: Response) {
  const payload = (await response.json()) as
    | SessionMetadata
    | {
        code?:
          | "epoch_conflict"
          | "lease_active"
          | "not_found"
          | "owner_mismatch"
        currentSession?: SessionMetadata
        message?: string
      }

  if (!response.ok) {
    const errorPayload = payload as {
      code?: "epoch_conflict" | "lease_active" | "not_found" | "owner_mismatch"
      currentSession?: SessionMetadata
      message?: string
    }
    throw new SessionDirectoryError(
      errorPayload.code ?? "not_found",
      errorPayload.message ?? "Remote session request failed",
      errorPayload.currentSession,
    )
  }

  return payload as SessionMetadata
}

export async function createRemoteSession({
  ownerClientId,
  ownerPeerId,
  sessionId,
}: {
  ownerClientId: string
  ownerPeerId: string
  sessionId: string
}) {
  const response = await fetch("/api/remote-sessions", {
    body: JSON.stringify({
      ownerClientId,
      ownerPeerId,
      sessionId,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  return readSessionResponse(response)
}

export async function getRemoteSession(sessionId: string) {
  const response = await fetch(getSessionRoute(sessionId), {
    method: "GET",
  })

  return readSessionResponse(response)
}

export async function claimRemoteSession({
  expectedEpoch,
  ownerClientId,
  ownerPeerId,
  peers,
  sessionId,
}: {
  expectedEpoch: number
  ownerClientId: string
  ownerPeerId: string
  peers: SessionMetadata["peers"]
  sessionId: string
}) {
  const response = await fetch(getSessionRoute(sessionId), {
    body: JSON.stringify({
      action: "claim",
      expectedEpoch,
      ownerClientId,
      ownerPeerId,
      peers,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  return readSessionResponse(response)
}

export async function heartbeatRemoteSession({
  epoch,
  ownerClientId,
  ownerPeerId,
  peers,
  sessionId,
}: {
  epoch: number
  ownerClientId: string
  ownerPeerId: string
  peers?: SessionMetadata["peers"]
  sessionId: string
}) {
  const response = await fetch(getSessionRoute(sessionId), {
    body: JSON.stringify({
      action: "heartbeat",
      epoch,
      ownerClientId,
      ownerPeerId,
      peers,
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  })

  return readSessionResponse(response)
}
