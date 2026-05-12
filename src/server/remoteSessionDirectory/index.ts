import {
  SessionDirectoryError,
  type SessionMetadata,
} from "@/utils/remoteSession/types"

const DEFAULT_LEASE_MS = 2_500

declare global {
  // eslint-disable-next-line no-var
  var __remoteSessionDirectory: Map<string, SessionMetadata> | undefined
}

const sessionStore =
  globalThis.__remoteSessionDirectory ??
  (globalThis.__remoteSessionDirectory = new Map<string, SessionMetadata>())

const cloneSession = (session: SessionMetadata): SessionMetadata => ({
  ...session,
  peers: session.peers.map((peer) => ({ ...peer })),
})

const getLeaseExpiry = (leaseMs = DEFAULT_LEASE_MS) => Date.now() + leaseMs

export function createSession({
  leaseMs = DEFAULT_LEASE_MS,
  ownerClientId,
  ownerPeerId,
  sessionId,
}: {
  leaseMs?: number
  ownerClientId: string
  ownerPeerId: string
  sessionId: string
}) {
  if (sessionStore.has(sessionId)) {
    throw new SessionDirectoryError(
      "epoch_conflict",
      `Session ${sessionId} already exists`,
      cloneSession(sessionStore.get(sessionId)!),
    )
  }

  const session = {
    epoch: 0,
    leaseExpiresAt: getLeaseExpiry(leaseMs),
    ownerClientId,
    ownerPeerId,
    peers: [
      {
        canControl: true,
        clientId: ownerClientId,
        peerId: ownerPeerId,
      },
    ],
    sessionId,
  } satisfies SessionMetadata

  sessionStore.set(sessionId, session)
  return cloneSession(session)
}

export function getSession(sessionId: string) {
  const session = sessionStore.get(sessionId)
  if (!session) {
    throw new SessionDirectoryError(
      "not_found",
      `Session ${sessionId} was not found`,
    )
  }

  return cloneSession(session)
}

export function claimSession({
  expectedEpoch,
  leaseMs = DEFAULT_LEASE_MS,
  ownerClientId,
  ownerPeerId,
  peers,
  sessionId,
}: {
  expectedEpoch: number
  leaseMs?: number
  ownerClientId: string
  ownerPeerId: string
  peers: SessionMetadata["peers"]
  sessionId: string
}) {
  const current = getSession(sessionId)

  if (current.epoch !== expectedEpoch) {
    throw new SessionDirectoryError(
      "epoch_conflict",
      `Session ${sessionId} moved to epoch ${current.epoch}`,
      current,
    )
  }

  if (
    current.leaseExpiresAt > Date.now() &&
    current.ownerClientId !== ownerClientId
  ) {
    throw new SessionDirectoryError(
      "lease_active",
      `Session ${sessionId} is still leased by ${current.ownerClientId}`,
      current,
    )
  }

  const nextSession = {
    ...current,
    epoch: current.epoch + 1,
    leaseExpiresAt: getLeaseExpiry(leaseMs),
    ownerClientId,
    ownerPeerId,
    peers,
  } satisfies SessionMetadata

  sessionStore.set(sessionId, nextSession)
  return cloneSession(nextSession)
}

export function heartbeatSession({
  epoch,
  leaseMs = DEFAULT_LEASE_MS,
  ownerClientId,
  ownerPeerId,
  peers,
  sessionId,
}: {
  epoch: number
  leaseMs?: number
  ownerClientId: string
  ownerPeerId: string
  peers?: SessionMetadata["peers"]
  sessionId: string
}) {
  const current = getSession(sessionId)

  if (
    current.epoch !== epoch ||
    current.ownerClientId !== ownerClientId ||
    current.ownerPeerId !== ownerPeerId
  ) {
    throw new SessionDirectoryError(
      "owner_mismatch",
      `Session ${sessionId} ownership changed`,
      current,
    )
  }

  const nextSession = {
    ...current,
    leaseExpiresAt: getLeaseExpiry(leaseMs),
    peers: peers ?? current.peers,
  } satisfies SessionMetadata

  sessionStore.set(sessionId, nextSession)
  return cloneSession(nextSession)
}
