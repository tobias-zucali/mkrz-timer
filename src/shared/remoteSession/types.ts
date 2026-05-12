export type SyncParams = {
  m: string
  s: string
  title: string
  bg: string
  fg: string
  pc: string
}

export type SessionSnapshot = {
  params: SyncParams
  state: {
    elapsedTime: number
    isPaused: boolean
    revision: number
    isStarted: boolean
    totalDuration: number
  }
}

export type SessionParticipant = {
  canControl: boolean
  clientId: string
}

export type RelaySessionState =
  | "connected"
  | "connecting"
  | "failed"
  | "reconnecting"
  | "recovered"

export type RelayConnectionDetails = {
  id: string
  isAlive: boolean
}

export type RelayClientMessage =
  | {
      type: "create-or-join"
      canControl: boolean
      clientId: string
      sessionId?: string
      snapshot?: SessionSnapshot
    }
  | {
      type: "sync"
      clientId: string
      sessionId: string
      params?: Partial<SyncParams>
      state?: SessionSnapshot["state"]
    }
  | {
      type: "leave"
      clientId: string
      sessionId: string
    }
  | {
      type: "heartbeat"
      clientId: string
      sessionId: string
    }
  | {
      type: "retry-join"
      canControl: boolean
      clientId: string
      sessionId: string
      snapshot?: SessionSnapshot
    }

export type RelayServerMessage =
  | {
      type: "session"
      sessionId: string
      participants: SessionParticipant[]
      snapshot: SessionSnapshot
    }
  | {
      type: "participant-list"
      sessionId: string
      participants: SessionParticipant[]
    }
  | {
      type: "state-updated"
      sessionId: string
      snapshot: SessionSnapshot
      participants: SessionParticipant[]
    }
  | {
      type: "error"
      message: string
    }
