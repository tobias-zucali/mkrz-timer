import type { TimerEndBehavior, TimerSequenceRow } from "../timerSequence"
import type { TimerFinishedSoundId } from "../timerSettings"

export type { TimerEndBehavior, TimerSequenceRow }

export type SyncParams = {
  activeIndex: number
  m: string
  s: string
  title: string
  bg: string
  fg: string
  pc: string
  tts: boolean
  snd: TimerFinishedSoundId
  rows: TimerSequenceRow[]
}

export type RemoteAccessRole = "control" | "readonly"

export type RemoteAccessTokenSet = {
  control: string
  readonly: string
}

export type TimerStatus = "idle" | "running" | "paused" | "finished"

export type TimerCommand =
  | {
      type: "start"
    }
  | {
      type: "pause"
    }
  | {
      type: "reset"
    }
  | {
      type: "next"
    }
  | {
      type: "previous"
    }
  | {
      type: "increase-minute"
    }
  | {
      type: "decrease-minute"
    }
  | {
      activeIndex: number
      type: "activate"
    }

export type SessionSnapshot = {
  params: SyncParams
  state: {
    anchorServerTimestamp: number
    currentRepeat: number
    durationSeconds: number
    elapsedSecondsAtAnchor: number
    elapsedTime: number
    isPaused: boolean
    revision: number
    isStarted: boolean
    lastUpdatedAt: number
    status: TimerStatus
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
      command?: TimerCommand
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
      serverTimestamp: number
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
      serverTimestamp: number
      snapshot: SessionSnapshot
      participants: SessionParticipant[]
    }
  | {
      type: "error"
      message: string
    }
