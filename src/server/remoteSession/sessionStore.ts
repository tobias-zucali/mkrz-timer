import type {
  RemoteAccessRole,
  RemoteAccessTokenSet,
  SessionParticipant,
  SessionSnapshot,
  SyncParams,
} from "../../shared/remoteSession/types.ts"
import {
  DEFAULT_SYNC_PARAMS,
  DEFAULT_TIMER_STATE,
  normalizeRemoteAccessToken,
  normalizeSessionSnapshot,
  normalizeSyncParamPatch,
  normalizeTimerState,
} from "../../shared/security/input.ts"

const DEFAULT_SESSION_TTL_MS = 5 * 60_000

export type RelaySessionRecord = {
  accessTokens: RemoteAccessTokenSet
  id: string
  lastSeenAt: number
  participants: SessionParticipant[]
  snapshot: SessionSnapshot
}

type SessionTokenRecord = {
  role: RemoteAccessRole
  sessionId: string
}

type SessionMetadataRecord = {
  accessTokens: RemoteAccessTokenSet
  snapshot: SessionSnapshot
}

const defaultSnapshot = (): SessionSnapshot => ({
  params: DEFAULT_SYNC_PARAMS,
  state: DEFAULT_TIMER_STATE,
})

const createAccessToken = () => crypto.randomUUID()

export class InMemorySessionStore {
  private readonly sessions = new Map<string, RelaySessionRecord>()
  private readonly sessionMetadata = new Map<string, SessionMetadataRecord>()
  private readonly sessionTokenRegistry = new Map<string, SessionTokenRecord>()
  private readonly sessionTtlMs: number

  constructor(sessionTtlMs = DEFAULT_SESSION_TTL_MS) {
    this.sessionTtlMs = sessionTtlMs
  }

  private upsertParticipant({
    canControl,
    clientId,
    session,
  }: {
    canControl: boolean
    clientId: string
    session: RelaySessionRecord
  }) {
    if (
      !session.participants.some(
        (participant) => participant.clientId === clientId,
      )
    ) {
      session.participants.push({ canControl, clientId })
      return
    }

    session.participants = session.participants.map((participant) =>
      participant.clientId === clientId
        ? { ...participant, canControl }
        : participant,
    )
  }

  private createSessionRecord({
    accessTokens = {
      control: createAccessToken(),
      readonly: createAccessToken(),
    },
    sessionId = crypto.randomUUID(),
    snapshot,
  }: {
    accessTokens?: RemoteAccessTokenSet
    sessionId?: string
    snapshot?: SessionSnapshot
  }) {
    const normalizedSnapshot = normalizeSessionSnapshot(
      snapshot ?? defaultSnapshot(),
    )
    const record: RelaySessionRecord = {
      accessTokens,
      id: sessionId,
      lastSeenAt: Date.now(),
      participants: [],
      snapshot: normalizedSnapshot,
    }

    this.sessionTokenRegistry.set(accessTokens.control, {
      role: "control",
      sessionId,
    })
    this.sessionTokenRegistry.set(accessTokens.readonly, {
      role: "readonly",
      sessionId,
    })
    this.sessionMetadata.set(sessionId, {
      accessTokens,
      snapshot: normalizedSnapshot,
    })

    this.sessions.set(sessionId, record)
    return record
  }

  create({
    clientId,
    snapshot,
  }: {
    clientId: string
    snapshot?: SessionSnapshot
  }): { role: "control"; session: RelaySessionRecord } {
    const created = this.createSessionRecord({ snapshot })
    this.upsertParticipant({
      canControl: true,
      clientId,
      session: created,
    })
    return {
      role: "control" as const,
      session: created,
    }
  }

  join({
    clientId,
    token,
  }: {
    clientId: string
    token: string
  }): { role: RemoteAccessRole; session: RelaySessionRecord } | null {
    const normalizedToken = normalizeRemoteAccessToken(token)
    if (normalizedToken === null) {
      return null
    }

    const tokenRecord = this.sessionTokenRegistry.get(normalizedToken)
    if (!tokenRecord) {
      return null
    }

    const existing = this.sessions.get(tokenRecord.sessionId)
    if (!existing) {
      if (tokenRecord.role !== "control") {
        return null
      }

      const metadata = this.sessionMetadata.get(tokenRecord.sessionId)
      if (!metadata) {
        return null
      }

      const restored = this.createSessionRecord({
        accessTokens: metadata.accessTokens,
        sessionId: tokenRecord.sessionId,
        snapshot: metadata.snapshot,
      })
      this.upsertParticipant({
        canControl: true,
        clientId,
        session: restored,
      })
      return {
        role: "control",
        session: restored,
      }
    }

    existing.lastSeenAt = Date.now()
    this.upsertParticipant({
      canControl: tokenRecord.role === "control",
      clientId,
      session: existing,
    })

    return {
      role: tokenRecord.role,
      session: existing,
    }
  }

  restore({
    clientId,
    snapshot,
    token,
  }: {
    clientId: string
    snapshot?: SessionSnapshot
    token: string
  }): { role: "control"; session: RelaySessionRecord } | null {
    const normalizedToken = normalizeRemoteAccessToken(token)
    if (normalizedToken === null) {
      return null
    }

    const tokenRecord = this.sessionTokenRegistry.get(normalizedToken)
    if (!tokenRecord || tokenRecord.role !== "control") {
      return null
    }

    const existing = this.sessions.get(tokenRecord.sessionId)
    if (existing) {
      existing.lastSeenAt = Date.now()
      this.upsertParticipant({
        canControl: true,
        clientId,
        session: existing,
      })
      return {
        role: "control" as const,
        session: existing,
      }
    }

    const metadata = this.sessionMetadata.get(tokenRecord.sessionId)
    const nextSnapshot = normalizeSessionSnapshot(
      snapshot ?? metadata?.snapshot ?? defaultSnapshot(),
    )

    if (!snapshot && !metadata) {
      return null
    }

    const restored = this.createSessionRecord({
      accessTokens: {
        control: normalizedToken,
        readonly:
          metadata?.accessTokens.readonly ??
          [...this.sessionTokenRegistry.entries()].find(
            ([, value]) =>
              value.role === "readonly" &&
              value.sessionId === tokenRecord.sessionId,
          )?.[0] ??
          createAccessToken(),
      },
      sessionId: tokenRecord.sessionId,
      snapshot: nextSnapshot,
    })
    this.upsertParticipant({
      canControl: true,
      clientId,
      session: restored,
    })
    return {
      role: "control" as const,
      session: restored,
    }
  }

  updateSnapshot({
    clientId,
    params,
    sessionId,
    state,
  }: {
    clientId: string
    params?: Partial<SyncParams>
    sessionId: string
    state?: SessionSnapshot["state"]
  }) {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    session.lastSeenAt = Date.now()
    const participant = session.participants.find(
      (candidate) => candidate.clientId === clientId,
    )

    if (!participant || !participant.canControl) {
      return null
    }

    session.snapshot = {
      params: {
        ...session.snapshot.params,
        ...(params ? normalizeSyncParamPatch(params) : {}),
      },
      state: state
        ? normalizeTimerState(state, session.snapshot.state)
        : session.snapshot.state,
    }
    this.sessionMetadata.set(sessionId, {
      accessTokens: session.accessTokens,
      snapshot: session.snapshot,
    })

    return session
  }

  touch(sessionId: string) {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    session.lastSeenAt = Date.now()
    return session
  }

  leave(sessionId: string, clientId: string) {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    session.participants = session.participants.filter(
      (participant) => participant.clientId !== clientId,
    )
    session.lastSeenAt = Date.now()

    if (session.participants.length === 0) {
      this.sessions.delete(sessionId)
      return null
    }

    return session
  }

  sweepExpired(now = Date.now()) {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastSeenAt >= this.sessionTtlMs) {
        this.sessions.delete(sessionId)
      }
    }
  }
}
