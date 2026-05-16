import type {
  SessionParticipant,
  SessionSnapshot,
  SyncParams,
} from "@/shared/remoteSession/types.ts"
import {
  DEFAULT_SYNC_PARAMS,
  DEFAULT_TIMER_STATE,
  normalizeSessionId,
  normalizeSessionSnapshot,
  normalizeSyncParamPatch,
  normalizeTimerState,
} from "../../shared/security/input.ts"

const DEFAULT_SESSION_TTL_MS = 5 * 60_000

export type RelaySessionRecord = {
  id: string
  lastSeenAt: number
  participants: SessionParticipant[]
  snapshot: SessionSnapshot
}

const defaultSnapshot = (): SessionSnapshot => ({
  params: DEFAULT_SYNC_PARAMS,
  state: DEFAULT_TIMER_STATE,
})

export class InMemorySessionStore {
  private readonly sessions = new Map<string, RelaySessionRecord>()
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

  createOrJoin({
    canControl,
    clientId,
    sessionId,
    snapshot,
  }: {
    canControl: boolean
    clientId: string
    sessionId?: string
    snapshot?: SessionSnapshot
  }) {
    const id = sessionId ? normalizeSessionId(sessionId) : crypto.randomUUID()
    if (!id) {
      return null
    }

    const existing = this.sessions.get(id)
    const now = Date.now()

    if (!existing) {
      const created: RelaySessionRecord = {
        id,
        lastSeenAt: now,
        participants: [{ canControl, clientId }],
        snapshot: normalizeSessionSnapshot(snapshot ?? defaultSnapshot()),
      }
      this.sessions.set(id, created)
      return created
    }

    existing.lastSeenAt = now
    this.upsertParticipant({ canControl, clientId, session: existing })
    return existing
  }

  restoreSession({
    canControl,
    clientId,
    sessionId,
    snapshot,
  }: {
    canControl: boolean
    clientId: string
    sessionId: string
    snapshot?: SessionSnapshot
  }) {
    if (!normalizeSessionId(sessionId)) {
      return null
    }

    const existing = this.sessions.get(sessionId)
    if (existing) {
      existing.lastSeenAt = Date.now()
      this.upsertParticipant({ canControl, clientId, session: existing })
      return existing
    }

    if (!canControl || !snapshot) {
      return null
    }

    const restored: RelaySessionRecord = {
      id: sessionId,
      lastSeenAt: Date.now(),
      participants: [{ canControl, clientId }],
      snapshot: normalizeSessionSnapshot(snapshot),
    }
    this.sessions.set(sessionId, restored)
    return restored
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
    if (!normalizeSessionId(sessionId)) {
      return null
    }

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
