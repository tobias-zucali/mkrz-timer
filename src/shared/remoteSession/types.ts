export type SyncParams = {
  m: string
  s: string
  title: string
  bg: string
  fg: string
  pc: string
}

export type RemoteAccessRole = "control" | "readonly"

export type RemoteAccessTokenSet = {
  control: string
  readonly: string
}

export type SessionSnapshot = {
  params: SyncParams
  state: {
    elapsedTime: number
    isPaused: boolean
    revision: number
    isStarted: boolean
    lastUpdatedAt: number
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
  participantLabel: "Control" | "View" | "You"
}

export type RelayClientMessage =
  | {
      type: "create-session"
      clientId: string
      snapshot: SessionSnapshot
    }
  | {
      type: "join-session"
      clientId: string
      role: RemoteAccessRole
      token: string
    }
  | {
      type: "retry-join-session"
      clientId: string
      role: RemoteAccessRole
      snapshot?: SessionSnapshot
      token: string
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
export type RelayServerMessage =
  | {
      type: "session"
      accessTokens?: RemoteAccessTokenSet
      participants: SessionParticipant[]
      sessionId: string
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
