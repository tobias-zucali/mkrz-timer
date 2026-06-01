import type {
  RemoteAccessRole,
  RemoteAccessTokenSet,
  SessionParticipant,
  SessionSnapshot,
  SyncParams,
  TimerCommand,
} from "../../shared/liveSession/types.ts"
import { mergeSyncParamsPatch } from "../../shared/liveSession/mergeSyncParamsPatch.ts"
import {
  DEFAULT_SYNC_PARAMS,
  DEFAULT_TIMER_STATE,
  normalizeRemoteAccessToken,
  normalizeSessionSnapshot,
  normalizeSyncParamPatch,
  normalizeTimerState,
} from "../../shared/security/input.ts"
import {
  applyTimerCommandToSnapshot,
  resolveSessionSnapshotAt,
} from "../../shared/timerState.ts"

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

const cloneSnapshot = (snapshot: SessionSnapshot) =>
  normalizeSessionSnapshot(structuredClone(snapshot))

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

  private writeSessionMetadata(session: RelaySessionRecord) {
    this.sessionMetadata.set(session.id, {
      accessTokens: session.accessTokens,
      snapshot: cloneSnapshot(session.snapshot),
    })
  }

  private resolveSessionRecord(session: RelaySessionRecord, now = Date.now()) {
    session.snapshot = resolveSessionSnapshotAt(session.snapshot, now)
    session.lastSeenAt = now
    this.writeSessionMetadata(session)
    return session
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
    const normalizedSnapshot = resolveSessionSnapshotAt(
      normalizeSessionSnapshot(snapshot ?? defaultSnapshot()),
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
    this.writeSessionMetadata(record)

    this.sessions.set(sessionId, record)
    return record
  }

  private getControlSession({
    clientId,
    sessionId,
  }: {
    clientId: string
    sessionId: string
  }) {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    const participant = session.participants.find(
      (candidate) => candidate.clientId === clientId,
    )

    if (!participant || !participant.canControl) {
      return null
    }

    return this.resolveSessionRecord(session)
  }

  private applyTimerCommand({
    command,
    state,
  }: {
    command: TimerCommand
    state: SessionSnapshot
  }): SessionSnapshot {
    return applyTimerCommandToSnapshot({
      command,
      snapshot: state,
    })
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
    this.writeSessionMetadata(created)
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
      this.writeSessionMetadata(restored)
      return {
        role: "control",
        session: restored,
      }
    }

    this.upsertParticipant({
      canControl: tokenRecord.role === "control",
      clientId,
      session: existing,
    })
    this.writeSessionMetadata(existing)

    return {
      role: tokenRecord.role,
      session: this.resolveSessionRecord(existing),
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
      this.upsertParticipant({
        canControl: true,
        clientId,
        session: existing,
      })
      return {
        role: "control" as const,
        session: this.resolveSessionRecord(existing),
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
    this.writeSessionMetadata(restored)
    return {
      role: "control" as const,
      session: restored,
    }
  }

  updateSnapshot({
    clientId,
    command,
    params,
    sessionId,
    state,
  }: {
    clientId: string
    command?: TimerCommand
    params?: Partial<SyncParams>
    sessionId: string
    state?: SessionSnapshot["state"]
  }) {
    const session = this.getControlSession({ clientId, sessionId })
    if (!session) {
      return null
    }

    let nextSnapshot = cloneSnapshot(session.snapshot)
    if (params) {
      const mergedParams = mergeSyncParamsPatch(
        nextSnapshot.params,
        normalizeSyncParamPatch(params) ?? {},
      )
      nextSnapshot = normalizeSessionSnapshot(
        {
          params: mergedParams,
          state: nextSnapshot.state,
        },
        nextSnapshot,
      )
      nextSnapshot = resolveSessionSnapshotAt(nextSnapshot)
    }

    if (command) {
      nextSnapshot = this.applyTimerCommand({
        command,
        state: nextSnapshot,
      })
    } else if (state) {
      nextSnapshot = {
        params: nextSnapshot.params,
        state: normalizeTimerState(state, nextSnapshot.state),
      }
      nextSnapshot = resolveSessionSnapshotAt(nextSnapshot)
    }

    session.snapshot = nextSnapshot
    this.writeSessionMetadata(session)
    return session
  }

  touch(sessionId: string) {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return null
    }

    return this.resolveSessionRecord(session)
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
    this.writeSessionMetadata(session)

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
