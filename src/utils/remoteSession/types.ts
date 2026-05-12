export type SessionPeer = {
  canControl: boolean
  clientId: string
  peerId: string
}

export type SessionMetadata = {
  epoch: number
  leaseExpiresAt: number
  ownerClientId: string
  ownerPeerId: string
  peers: SessionPeer[]
  sessionId: string
}

export type SessionDirectorySource = "directory" | "local" | "sync"

export type SessionDirectoryErrorCode =
  | "epoch_conflict"
  | "lease_active"
  | "not_found"
  | "owner_mismatch"

export class SessionDirectoryError extends Error {
  code: SessionDirectoryErrorCode
  currentSession?: SessionMetadata

  constructor(
    code: SessionDirectoryErrorCode,
    message: string,
    currentSession?: SessionMetadata,
  ) {
    super(message)
    this.code = code
    this.currentSession = currentSession
  }
}
