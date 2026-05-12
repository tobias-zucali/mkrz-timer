import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PeerErrorType } from "peerjs"

import {
  claimRemoteSession,
  createRemoteSession,
  getRemoteSession,
  heartbeatRemoteSession,
} from "@/utils/remoteSessionDirectory"
import {
  type SessionDirectorySource,
  SessionDirectoryError,
  type SessionMetadata,
  type SessionPeer,
} from "@/utils/remoteSession/types"
import { TimerState } from "@/utils/useTimer"
import debug from "@/utils/debug"

import PeerConnection from "./PeerConnection"

export type SyncParams = {
  m: string
  s: string
  title: string
  bg: string
  fg: string
  pc: string
}

type PresenceAction = {
  type: "presence"
  canControl: boolean
  clientId: string
}

const getSyncAction = ({
  params,
  connections,
  session,
  state,
}: {
  params?: Partial<SyncParams>
  connections: string[]
  session: SessionMetadata | null
  state?: TimerState
}) => ({
  type: "sync" as const,
  params,
  connections,
  session,
  state,
})

export type SyncAction = ReturnType<typeof getSyncAction>
export type PeerLifecycleState =
  | "connected"
  | "connecting"
  | "failed"
  | "recovered"
  | "reconnecting"

const AUTO_RECOVERY_TIMEOUT_MS = 18_000
const CLAIM_RETRY_MS = 1_000
const CLAIM_ROSTER_STAGGER_MS = 350
const HOST_LINK_LOSS_GRACE_MS = 500
const INITIAL_CLAIM_DELAY_MS = 250
const RECOVERY_RETRY_INTERVAL_MS = 250
const RECOVERED_BADGE_TIMEOUT_MS = 4_000
const SESSION_HEARTBEAT_MS = 1_000
const SESSION_POLL_MS = 1_000

const RETRYABLE_PEER_ERRORS = new Set<`${PeerErrorType}`>([
  PeerErrorType.Network,
  PeerErrorType.ServerError,
  PeerErrorType.SocketClosed,
  PeerErrorType.SocketError,
])

const getPeerErrorType = (error: unknown) => {
  if (error && typeof error === "object" && "type" in error) {
    return error.type as `${PeerErrorType}`
  }
}

const isRetryablePeerError = (error: unknown) => {
  const type = getPeerErrorType(error)
  return Boolean(type && RETRYABLE_PEER_ERRORS.has(type))
}

const isUnavailablePeerError = (error: unknown, peerId?: string | null) => {
  if (getPeerErrorType(error) === PeerErrorType.UnavailableID) {
    return true
  }

  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.message.includes("Could not connect to peer") &&
    (!peerId || error.message.includes(peerId))
  )
}

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error))

const wait = (delay: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, delay)
  })

const createLocalClientId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }

  return `client-${Math.random().toString(36).slice(2, 10)}`
}

const createSessionId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }

  return `session-${Math.random().toString(36).slice(2, 10)}`
}

const sortPeersByClientId = (peers: SessionPeer[]) =>
  [...peers].sort((a, b) => a.clientId.localeCompare(b.clientId))

const getControlPeers = (peers: SessionPeer[]) =>
  sortPeersByClientId(peers.filter((sessionPeer) => sessionPeer.canControl))

const isSessionHost = (session: SessionMetadata | null, peerId?: string) =>
  Boolean(session?.ownerPeerId && peerId && session.ownerPeerId === peerId)

export default function usePeer({
  canControlSession = false,
  remoteIdParam,
  syncParamsRef,
  syncStateRef,
  onHandleAction,
}: {
  canControlSession?: boolean
  remoteIdParam: string | null
  syncParamsRef: React.RefObject<SyncParams>
  syncStateRef: React.RefObject<TimerState>
  onHandleAction: (action: SyncAction) => void
}) {
  const [error, setError] = useState<Error | null>(null)
  const [connections, setConnections] = useState<string[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [remoteLost, setRemoteLost] = useState(false)
  const [peerId, setPeerId] = useState<string | undefined>()
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false)
  const [hasReceivedInitialSync, setHasReceivedInitialSync] = useState(false)
  const [lifecycleState, setLifecycleState] =
    useState<PeerLifecycleState>("connecting")
  const [canRetryManually, setCanRetryManually] = useState(false)
  const [peerEventTimeline, setPeerEventTimeline] = useState<string[]>([])
  const [session, setSession] = useState<SessionMetadata | null>(null)
  const [sessionSource, setSessionSource] =
    useState<SessionDirectorySource>("local")

  const localClientIdRef = useRef(createLocalClientId())
  const knownPeersRef = useRef(new Map<string, SessionPeer>())
  const latestSessionRef = useRef<SessionMetadata | null>(null)
  const latestControlRosterRef = useRef<SessionPeer[]>([])
  const peerRef = useRef<PeerConnection | null>(null)
  const recoveryRunIdRef = useRef(0)
  const recoveredTimeoutRef = useRef<number | undefined>(undefined)
  const hostDisconnectSignalRef = useRef(false)
  const hasRequestedRemoteConnectionRef = useRef(false)
  const heartbeatIntervalRef = useRef<number | undefined>(undefined)
  const syncAllRef = useRef<
    | (({
        includeParams,
        keys,
        state,
      }: {
        includeParams?: boolean
        keys?: string[]
        state?: Partial<TimerState>
      }) => void)
    | null
  >(null)

  const pushPeerEvent = useCallback((event: string) => {
    const entry = `${new Date().toISOString()} ${event}`
    setPeerEventTimeline((current) => [...current, entry].slice(-20))
  }, [])

  const currentMemoRefs = {
    canControlSession,
    connections,
    lifecycleState,
    onHandleAction,
    peerId,
    remoteIdParam,
    session,
  }
  const memoRefs = useRef(currentMemoRefs)
  memoRefs.current = currentMemoRefs

  const isHostingSession = () =>
    isSessionHost(latestSessionRef.current, peerRef.current?.getPeerId())

  const updateSessionState = useCallback(
    (
      nextSession: SessionMetadata | null,
      source: SessionDirectorySource = "sync",
    ) => {
      latestSessionRef.current = nextSession
      latestControlRosterRef.current = nextSession
        ? getControlPeers(nextSession.peers)
        : []
      setSession(nextSession)
      setSessionSource(source)
    },
    [],
  )

  const buildHostedSessionMetadata = useCallback(
    ({
      epoch,
      leaseExpiresAt,
      ownerPeerId,
      sessionId,
    }: {
      epoch: number
      leaseExpiresAt: number
      ownerPeerId: string
      sessionId: string
    }): SessionMetadata => {
      const ownPeer: SessionPeer = {
        canControl: true,
        clientId: localClientIdRef.current,
        peerId: ownerPeerId,
      }

      const activeConnectionIds =
        peerRef.current?.getConnections() ?? memoRefs.current.connections

      const peers = sortPeersByClientId([
        ownPeer,
        ...Array.from(knownPeersRef.current.values()).filter(
          (peer) =>
            activeConnectionIds.includes(peer.peerId) &&
            peer.peerId !== ownerPeerId,
        ),
      ])

      return {
        epoch,
        leaseExpiresAt,
        ownerClientId: localClientIdRef.current,
        ownerPeerId,
        peers,
        sessionId,
      }
    },
    [],
  )

  const getCurrentSessionMetadata = useCallback(() => {
    return latestSessionRef.current
  }, [])

  const getClaimDelayMs = useCallback(() => {
    const controlPeers = latestControlRosterRef.current

    const controlPeerIndex = controlPeers.findIndex(
      ({ clientId }) => clientId === localClientIdRef.current,
    )

    if (controlPeerIndex < 0) {
      return INITIAL_CLAIM_DELAY_MS
    }

    return INITIAL_CLAIM_DELAY_MS + controlPeerIndex * CLAIM_ROSTER_STAGGER_MS
  }, [])

  const sendPresence = useCallback(
    async (id: string) => {
      if (!memoRefs.current.peerId || memoRefs.current.peerId === id) {
        return
      }

      try {
        await peerRef.current?.send(id, {
          canControl: memoRefs.current.canControlSession,
          clientId: localClientIdRef.current,
          type: "presence",
        } satisfies PresenceAction)
        pushPeerEvent(`presence_sent: ${id}`)
      } catch (nextError) {
        debug.log("Error sending presence", nextError)
      }
    },
    [pushPeerEvent],
  )

  const markRecovered = useCallback(() => {
    window.clearTimeout(recoveredTimeoutRef.current)
    setLifecycleState("recovered")
    setCanRetryManually(false)
    recoveredTimeoutRef.current = window.setTimeout(() => {
      setLifecycleState("connected")
    }, RECOVERED_BADGE_TIMEOUT_MS)
  }, [])

  const resolveSessionFromDirectory = useCallback(
    async (sessionId: string) => {
      const nextSession = await getRemoteSession(sessionId)
      pushPeerEvent(`session_resolved: ${nextSession.ownerPeerId.slice(-4)}`)
      updateSessionState(nextSession, "directory")
      return nextSession
    },
    [pushPeerEvent, updateSessionState],
  )

  const createPeer = () => {
    const newPeer = new PeerConnection({
      onPeerOpen: debug.wrap("usePeer onPeerOpen", () => {
        pushPeerEvent("peer_open")
      }),
      onError: debug.wrap("usePeer onError", (nextError) => {
        const isRetryable = isRetryablePeerError(nextError)
        pushPeerEvent(`peer_error: ${nextError.message}`)

        if (memoRefs.current.remoteIdParam && isRetryable) {
          void peerRef.current?.closePeerSession(false)
          setPeerId(undefined)
          setRemoteLost(true)
          setLifecycleState((current) =>
            current === "failed" ? current : "reconnecting",
          )
          return
        }

        setError(nextError)
      }),
      onConnection: debug.wrap("usePeer onConnection", (senderId: string) => {
        pushPeerEvent(`incoming_connection: ${senderId}`)
        newPeer.send(
          senderId,
          getSyncAction({
            params: syncParamsRef.current,
            connections: newPeer.getConnections(),
            session: getCurrentSessionMetadata(),
            state: syncStateRef.current,
          }),
        )
      }),
      onReceiveData: debug.wrap(
        "usePeer onReceiveData",
        (senderId: string, data: unknown) => {
          if (!data || typeof data !== "object" || !("type" in data)) {
            return
          }

          switch (data.type) {
            case "presence": {
              const action = data as PresenceAction
              knownPeersRef.current.set(senderId, {
                canControl: action.canControl,
                clientId: action.clientId,
                peerId: senderId,
              })
              pushPeerEvent(`presence_received: ${senderId}`)
              if (isHostingSession()) {
                syncAllRef.current?.({})
              }
              return
            }
            case "sync": {
              const action = data as SyncAction

              if (action.session) {
                updateSessionState(action.session, "sync")
              }

              memoRefs.current.onHandleAction(action)
              setHasReceivedInitialSync(true)
              hostDisconnectSignalRef.current = false
              setRemoteLost(false)
              setError(null)

              if (
                memoRefs.current.lifecycleState === "reconnecting" ||
                memoRefs.current.lifecycleState === "failed"
              ) {
                markRecovered()
              } else if (
                !isSessionHost(action.session ?? null, memoRefs.current.peerId)
              ) {
                setLifecycleState("connected")
              }

              if (
                action.session?.ownerPeerId &&
                !isSessionHost(action.session, memoRefs.current.peerId) &&
                senderId === action.session.ownerPeerId
              ) {
                void sendPresence(senderId)
              }

              if (
                isSessionHost(action.session ?? null, memoRefs.current.peerId)
              ) {
                debug.log("is remote host, syncing others", senderId, data)
                newPeer.getConnections().forEach((connId) => {
                  if (connId !== senderId) {
                    newPeer.send(connId, data)
                  }
                })
              }
              return
            }
          }
        },
      ),
      onClose: debug.wrap("usePeer onClose", (id?: string) => {
        debug.log("Peer closed", id)
        pushPeerEvent(`peer_close: ${id ?? "unknown"}`)
        setPeerId(undefined)
      }),
      onConnectionClose: debug.wrap(
        "usePeer onConnectionClose",
        (id: string, reason?: "disconnect") => {
          pushPeerEvent(`connection_close: ${id}`)
          knownPeersRef.current.delete(id)

          if (isHostingSession()) {
            syncAllRef.current?.({})
          }

          if (latestSessionRef.current?.ownerPeerId === id) {
            debug.log("remote lost", id)
            hostDisconnectSignalRef.current = reason === "disconnect"
            setRemoteLost(true)
            setLifecycleState("reconnecting")
          }
        },
      ),
      onConnectionsChange: debug.wrap(
        "usePeer onConnectionsChange",
        (nextConnections: string[]) => {
          pushPeerEvent(`connections_change: ${nextConnections.length}`)
          setConnections(nextConnections)

          const activeConnections = new Set(nextConnections)
          for (const nextPeerId of Array.from(knownPeersRef.current.keys())) {
            if (!activeConnections.has(nextPeerId)) {
              knownPeersRef.current.delete(nextPeerId)
            }
          }
        },
      ),
    })
    return newPeer
  }

  const [peer] = useState<PeerConnection>(() => {
    const nextPeer = createPeer()
    peerRef.current = nextPeer
    return nextPeer
  })

  const syncAll = useCallback(
    ({
      includeParams = true,
      keys,
      state = {},
    }: {
      includeParams?: boolean
      keys?: string[]
      state?: Partial<TimerState>
    }) => {
      debug.log("usePeer syncAll", { keys, state })
      peer.sendAll(
        getSyncAction({
          params: includeParams
            ? {
                ...(keys
                  ? keys.reduce((prev, key) => {
                      if (Object.hasOwn(syncParamsRef.current, key)) {
                        return {
                          ...prev,
                          [key]: syncParamsRef.current[key as keyof SyncParams],
                        }
                      }
                      debug.warn(`usePeer syncAll: key ${key} not found`, {
                        keys,
                        syncParams: syncParamsRef.current,
                      })
                      return prev
                    }, {})
                  : syncParamsRef.current),
              }
            : undefined,
          connections: peer.getConnections(),
          session: getCurrentSessionMetadata(),
          state: {
            ...state,
            ...syncStateRef.current,
          },
        }),
      )
    },
    [getCurrentSessionMetadata, peer, syncParamsRef, syncStateRef],
  )
  syncAllRef.current = syncAll

  const createPeerWithRetry = useCallback(
    async (id?: string) => {
      const maxAttempts = 3

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const nextPeerId = await peer.createPeer(id, true)
          setPeerId(nextPeerId)
          setHasConnectedOnce(true)
          return nextPeerId
        } catch (nextError) {
          const peerErrorType = getPeerErrorType(nextError)
          if (peerErrorType === PeerErrorType.UnavailableID) {
            return
          }
          if (isRetryablePeerError(nextError) && attempt < maxAttempts) {
            await wait(400 * attempt)
            continue
          }
          throw nextError
        }
      }
    },
    [peer],
  )

  const createHostedSession = useCallback(
    async (ownerPeerId: string) => {
      const sessionId = createSessionId()
      const createdSession = await createRemoteSession({
        ownerClientId: localClientIdRef.current,
        ownerPeerId,
        sessionId,
      })
      updateSessionState(
        buildHostedSessionMetadata({
          epoch: createdSession.epoch,
          leaseExpiresAt: createdSession.leaseExpiresAt,
          ownerPeerId,
          sessionId,
        }),
        "local",
      )
      return sessionId
    },
    [buildHostedSessionMetadata, updateSessionState],
  )

  const reconnectKnownPeers = useCallback(
    async (nextSession: SessionMetadata, currentPeerId: string) => {
      const peerIds = nextSession.peers
        .map((nextPeer) => nextPeer.peerId)
        .filter((nextPeerId) => nextPeerId !== currentPeerId)

      await Promise.allSettled(
        peerIds.map(async (nextPeerId) => {
          try {
            await peer.connectPeer(nextPeerId)
            await sendPresence(nextPeerId)
          } catch (nextError) {
            debug.log("Known peer reconnect failed", nextPeerId, nextError)
          }
        }),
      )
    },
    [peer, sendPresence],
  )

  const claimHostedSession = useCallback(
    async (sessionId: string) => {
      const currentPeerId = peer.getPeerId() || (await createPeerWithRetry())
      if (!currentPeerId) {
        return
      }

      const currentSession =
        latestSessionRef.current?.sessionId === sessionId
          ? latestSessionRef.current
          : await resolveSessionFromDirectory(sessionId)

      const localPeer: SessionPeer = {
        canControl: true,
        clientId: localClientIdRef.current,
        peerId: currentPeerId,
      }

      const peersByClientId = new Map<string, SessionPeer>(
        currentSession.peers.map((nextPeer) => [nextPeer.clientId, nextPeer]),
      )
      peersByClientId.set(localPeer.clientId, localPeer)

      const claimedSession = await claimRemoteSession({
        expectedEpoch: currentSession.epoch,
        ownerClientId: localClientIdRef.current,
        ownerPeerId: currentPeerId,
        peers: sortPeersByClientId(Array.from(peersByClientId.values())),
        sessionId,
      })

      updateSessionState(
        buildHostedSessionMetadata({
          epoch: claimedSession.epoch,
          leaseExpiresAt: claimedSession.leaseExpiresAt,
          ownerPeerId: currentPeerId,
          sessionId,
        }),
        "directory",
      )

      await reconnectKnownPeers(claimedSession, currentPeerId)

      return claimedSession
    },
    [
      buildHostedSessionMetadata,
      createPeerWithRetry,
      peer,
      reconnectKnownPeers,
      resolveSessionFromDirectory,
      updateSessionState,
    ],
  )

  const connectToSessionOwner = useCallback(
    async (nextSession: SessionMetadata) => {
      const currentPeerId = peer.getPeerId() || (await createPeerWithRetry())
      if (!currentPeerId) {
        return
      }

      if (nextSession.ownerPeerId === currentPeerId) {
        updateSessionState(nextSession, "directory")
        setLifecycleState("connected")
        return currentPeerId
      }

      await peer.connectPeer(nextSession.ownerPeerId)
      await sendPresence(nextSession.ownerPeerId)
      updateSessionState(nextSession, "directory")
      return currentPeerId
    },
    [createPeerWithRetry, peer, sendPresence, updateSessionState],
  )

  const connectRemote = useCallback(
    async (sessionId?: string | null) => {
      recoveryRunIdRef.current += 1
      hasRequestedRemoteConnectionRef.current = true
      setCanRetryManually(false)
      setError(null)
      setIsConnecting(true)
      setLifecycleState(hasConnectedOnce ? "reconnecting" : "connecting")

      try {
        if (!sessionId) {
          const nextPeerId = await createPeerWithRetry()
          if (nextPeerId) {
            const createdSessionId = await createHostedSession(nextPeerId)
            setLifecycleState("connected")
            return createdSessionId
          }
          return
        }

        const nextSession = await resolveSessionFromDirectory(sessionId)
        const currentPeerId = await connectToSessionOwner(nextSession)
        setLifecycleState(hasConnectedOnce ? "recovered" : "connecting")
        return currentPeerId
      } catch (nextError) {
        debug.error(nextError)
        const errorValue = toError(nextError)
        if (sessionId) {
          setRemoteLost(true)
          setLifecycleState(hasConnectedOnce ? "reconnecting" : "connecting")
          if (!isRetryablePeerError(nextError)) {
            setError(errorValue)
          }
        } else {
          setError(errorValue)
          setLifecycleState("failed")
        }
      } finally {
        setIsConnecting(false)
      }
    },
    [
      connectToSessionOwner,
      createHostedSession,
      createPeerWithRetry,
      hasConnectedOnce,
      resolveSessionFromDirectory,
    ],
  )

  const retryConnection = useCallback(async () => {
    setCanRetryManually(false)
    setError(null)
    recoveryRunIdRef.current += 1
    setRemoteLost(false)
    window.setTimeout(() => {
      setRemoteLost(true)
    }, 0)
  }, [])

  useEffect(() => {
    if (!remoteIdParam) {
      hasRequestedRemoteConnectionRef.current = false
      setRemoteLost(false)
      setHasReceivedInitialSync(false)
      setCanRetryManually(false)
      setLifecycleState("connected")
      return
    }

    if (!hasRequestedRemoteConnectionRef.current) {
      hasRequestedRemoteConnectionRef.current = true
      connectRemote(remoteIdParam)
    }
  }, [connectRemote, remoteIdParam])

  useEffect(() => {
    if (!remoteIdParam || !remoteLost) {
      return
    }

    const recoveryRunId = recoveryRunIdRef.current + 1
    recoveryRunIdRef.current = recoveryRunId

    let isCancelled = false

    const recover = async () => {
      const startedAt = Date.now()
      const initialClaimDelayMs = hostDisconnectSignalRef.current
        ? 0
        : getClaimDelayMs()
      let nextClaimAttemptAt = initialClaimDelayMs

      setCanRetryManually(false)
      setError(null)
      setIsConnecting(true)
      setLifecycleState("reconnecting")

      while (!isCancelled && recoveryRunIdRef.current === recoveryRunId) {
        const elapsed = Date.now() - startedAt

        if (!remoteIdParam) {
          setRemoteLost(false)
          setIsConnecting(false)
          return
        }

        if (elapsed >= AUTO_RECOVERY_TIMEOUT_MS) {
          setIsConnecting(false)
          setLifecycleState("failed")
          setCanRetryManually(true)
          setError(
            new Error("Automatic recovery timed out. Retry the connection."),
          )
          return
        }

        try {
          const currentPeerId =
            peer.getPeerId() || (await createPeerWithRetry())
          if (!currentPeerId) {
            await wait(RECOVERY_RETRY_INTERVAL_MS)
            continue
          }

          let resolvedSession =
            latestSessionRef.current?.sessionId === remoteIdParam
              ? latestSessionRef.current
              : null

          if (!resolvedSession) {
            resolvedSession = await resolveSessionFromDirectory(remoteIdParam)
          }

          if (resolvedSession.ownerPeerId === currentPeerId) {
            setRemoteLost(false)
            setIsConnecting(false)
            return
          }

          try {
            await peer.connectPeer(resolvedSession.ownerPeerId)
            await sendPresence(resolvedSession.ownerPeerId)
            setRemoteLost(false)
            setIsConnecting(false)
            return
          } catch (connectError) {
            const refreshedSession = await resolveSessionFromDirectory(
              remoteIdParam,
            ).catch((directoryError) => {
              if (directoryError instanceof SessionDirectoryError) {
                return directoryError.currentSession ?? resolvedSession
              }
              throw directoryError
            })

            const currentSession = refreshedSession ?? resolvedSession
            updateSessionState(currentSession, "directory")

            const leaseExpired =
              currentSession.leaseExpiresAt <= Date.now() ||
              hostDisconnectSignalRef.current

            if (
              canControlSession &&
              leaseExpired &&
              elapsed >= nextClaimAttemptAt
            ) {
              nextClaimAttemptAt += CLAIM_RETRY_MS

              try {
                const claimedSession = await claimHostedSession(remoteIdParam)
                if (claimedSession) {
                  setRemoteLost(false)
                  setIsConnecting(false)
                  hostDisconnectSignalRef.current = false
                  markRecovered()
                  return
                }
              } catch (claimError) {
                if (
                  claimError instanceof SessionDirectoryError &&
                  claimError.currentSession
                ) {
                  updateSessionState(claimError.currentSession, "directory")
                } else {
                  debug.log("Failover claim attempt failed", claimError)
                }
              }
            }

            const peerErrorType = getPeerErrorType(connectError)
            if (
              peerErrorType &&
              peerErrorType !== PeerErrorType.UnavailableID &&
              !isUnavailablePeerError(
                connectError,
                currentSession.ownerPeerId,
              ) &&
              !isRetryablePeerError(connectError)
            ) {
              setError(toError(connectError))
            }
          }
        } catch (nextError) {
          debug.error(nextError)
        }

        await wait(RECOVERY_RETRY_INTERVAL_MS)
      }
    }

    recover().catch((nextError) => {
      debug.error(nextError)
      setIsConnecting(false)
      setLifecycleState("failed")
      setCanRetryManually(true)
      setError(toError(nextError))
    })

    return () => {
      isCancelled = true
    }
  }, [
    canControlSession,
    claimHostedSession,
    createPeerWithRetry,
    getClaimDelayMs,
    markRecovered,
    peer,
    remoteIdParam,
    remoteLost,
    resolveSessionFromDirectory,
    sendPresence,
    updateSessionState,
  ])

  const allConnectionCount = peer.getAllConnections().length

  useEffect(() => {
    if (
      !remoteIdParam ||
      isSessionHost(session, peerId) ||
      !hasReceivedInitialSync ||
      remoteLost
    ) {
      return
    }

    if (connections.length > 0) {
      return
    }

    const markHostLinkMissing = () => {
      if (
        !memoRefs.current.remoteIdParam ||
        isSessionHost(memoRefs.current.session, memoRefs.current.peerId) ||
        memoRefs.current.connections.length > 0
      ) {
        return
      }

      pushPeerEvent("host_link_missing")
      hostDisconnectSignalRef.current = false
      setRemoteLost(true)
      setLifecycleState((current) =>
        current === "failed" ? current : "reconnecting",
      )
    }

    if (allConnectionCount === 0) {
      markHostLinkMissing()
      return
    }

    const hostLinkLossTimeoutId = window.setTimeout(
      markHostLinkMissing,
      HOST_LINK_LOSS_GRACE_MS,
    )

    return () => {
      window.clearTimeout(hostLinkLossTimeoutId)
    }
  }, [
    allConnectionCount,
    connections.length,
    hasReceivedInitialSync,
    peerId,
    pushPeerEvent,
    remoteIdParam,
    remoteLost,
    session,
  ])

  useEffect(() => {
    window.clearInterval(heartbeatIntervalRef.current)
    heartbeatIntervalRef.current = undefined

    if (!session || !peerId || !isSessionHost(session, peerId)) {
      return
    }

    const syncHeartbeat = async () => {
      try {
        const nextSession = await heartbeatRemoteSession({
          epoch: session.epoch,
          ownerClientId: session.ownerClientId,
          ownerPeerId: session.ownerPeerId,
          peers: session.peers,
          sessionId: session.sessionId,
        })
        updateSessionState(
          buildHostedSessionMetadata({
            epoch: nextSession.epoch,
            leaseExpiresAt: nextSession.leaseExpiresAt,
            ownerPeerId: session.ownerPeerId,
            sessionId: session.sessionId,
          }),
          "local",
        )
      } catch (nextError) {
        debug.log("Session heartbeat failed", nextError)
      }
    }

    void syncHeartbeat()
    heartbeatIntervalRef.current = window.setInterval(() => {
      void syncHeartbeat()
    }, SESSION_HEARTBEAT_MS)

    return () => {
      window.clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = undefined
    }
  }, [buildHostedSessionMetadata, peerId, session, updateSessionState])

  useEffect(() => {
    if (!remoteIdParam || isSessionHost(session, peerId)) {
      return
    }

    let isCancelled = false
    let previousOwnerPeerId = session?.ownerPeerId ?? null
    let previousEpoch = session?.epoch ?? null

    const pollSession = async () => {
      try {
        const nextSession = await getRemoteSession(remoteIdParam)
        if (isCancelled) {
          return
        }

        updateSessionState(nextSession, "directory")

        const ownerChanged =
          nextSession.ownerPeerId !== previousOwnerPeerId ||
          nextSession.epoch !== previousEpoch

        previousOwnerPeerId = nextSession.ownerPeerId
        previousEpoch = nextSession.epoch

        if (
          nextSession.ownerPeerId &&
          memoRefs.current.peerId &&
          nextSession.ownerPeerId === memoRefs.current.peerId
        ) {
          setRemoteLost(false)
          setCanRetryManually(false)
          setError(null)
          return
        }

        if (
          ownerChanged &&
          (memoRefs.current.lifecycleState === "failed" || remoteLost)
        ) {
          await peerRef.current?.closePeerSession(false)
          setPeerId(undefined)
          setCanRetryManually(false)
          setError(null)
          recoveryRunIdRef.current += 1
          setRemoteLost(false)
          window.setTimeout(() => {
            setRemoteLost(true)
          }, 0)
        }
      } catch (nextError) {
        debug.log("Session poll failed", nextError)
      }
    }

    void pollSession()
    const intervalId = window.setInterval(() => {
      void pollSession()
    }, SESSION_POLL_MS)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [peerId, remoteIdParam, remoteLost, session, updateSessionState])

  const disconnect = useCallback(async () => {
    recoveryRunIdRef.current += 1
    hasRequestedRemoteConnectionRef.current = false
    knownPeersRef.current.clear()
    updateSessionState(null, "local")
    hostDisconnectSignalRef.current = false
    setCanRetryManually(false)
    setError(null)
    setHasReceivedInitialSync(false)
    setHasConnectedOnce(false)
    setIsConnecting(false)
    setLifecycleState("connected")
    setRemoteLost(false)
    return peer.closePeerSession()
  }, [peer, updateSessionState])

  useEffect(() => {
    return () => {
      window.clearTimeout(recoveredTimeoutRef.current)
      window.clearInterval(heartbeatIntervalRef.current)
    }
  }, [])

  return useMemo(
    () => ({
      canRetryManually,
      connectRemote,
      connections,
      disconnect,
      error,
      hasConnectedOnce,
      hasReceivedInitialSync,
      isConnecting,
      isHostingSession: isSessionHost(session, peerId),
      lifecycleState,
      peer,
      peerEventTimeline,
      peerId,
      remoteLost,
      retryConnection,
      session,
      sessionSource,
      syncAll,
    }),
    [
      canRetryManually,
      connectRemote,
      connections,
      disconnect,
      error,
      hasConnectedOnce,
      hasReceivedInitialSync,
      isConnecting,
      lifecycleState,
      peer,
      peerEventTimeline,
      peerId,
      remoteLost,
      retryConnection,
      session,
      sessionSource,
      syncAll,
    ],
  )
}
