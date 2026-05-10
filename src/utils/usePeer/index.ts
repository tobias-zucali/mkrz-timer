import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { PeerErrorType } from "peerjs"

import PeerConnection from "./PeerConnection"
import { TimerState } from "@/utils/useTimer"
import debug from "@/utils/debug"

export type SyncParams = {
  m: string
  s: string
  title: string
  bg: string
  fg: string
  pc: string
}

export type SessionPeer = {
  canControl: boolean
  clientId: string
  peerId: string
}

export type SessionMetadata = {
  epoch: number
  ownerClientId: string
  ownerPeerId: string
  peers: SessionPeer[]
  sessionId: string
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
  params: Partial<SyncParams>
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
const CLAIM_RETRY_MS = 2_000
const HOST_LINK_LOSS_GRACE_MS = 1_500
const INITIAL_CLAIM_DELAY_MS = 1_000
const RECOVERED_BADGE_TIMEOUT_MS = 4_000

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

  const localClientIdRef = useRef(createLocalClientId())
  const knownPeersRef = useRef(new Map<string, SessionPeer>())
  const latestSessionRef = useRef<SessionMetadata | null>(null)
  const peerRef = useRef<PeerConnection | null>(null)
  const recoveryRunIdRef = useRef(0)
  const recoveredTimeoutRef = useRef<number | undefined>(undefined)
  const hasRequestedRemoteConnectionRef = useRef(false)
  const syncAllRef = useRef<
    | (({
        keys,
        state,
      }: {
        keys?: string[]
        state?: Partial<TimerState>
      }) => void)
    | null
  >(null)

  const pushPeerEvent = useCallback((event: string) => {
    const entry = `${new Date().toISOString()} ${event}`
    setPeerEventTimeline((current) => [...current, entry].slice(-20))
  }, [])

  const isRemote = Boolean(peerId && remoteIdParam === peerId)

  const currentMemoRefs = {
    canControlSession,
    connections,
    isRemote,
    lifecycleState,
    onHandleAction,
    peerId,
    remoteIdParam,
  }
  const memoRefs = useRef(currentMemoRefs)
  memoRefs.current = currentMemoRefs

  const isHostingSession = () =>
    Boolean(
      memoRefs.current.peerId &&
      (memoRefs.current.isRemote || !memoRefs.current.remoteIdParam),
    )

  const buildSessionMetadata = useCallback(
    (ownerPeerId: string): SessionMetadata => {
      const previousSession = latestSessionRef.current
      const sessionId =
        previousSession?.sessionId || remoteIdParam || ownerPeerId
      const nextEpoch =
        previousSession &&
        previousSession.ownerClientId !== localClientIdRef.current
          ? previousSession.epoch + 1
          : (previousSession?.epoch ?? 0)

      const ownPeer: SessionPeer = {
        canControl:
          memoRefs.current.canControlSession ||
          memoRefs.current.isRemote ||
          !memoRefs.current.remoteIdParam,
        clientId: localClientIdRef.current,
        peerId: ownerPeerId,
      }

      const activeConnectionIds =
        peerRef.current?.getConnections() ?? connections
      const peers = [
        ownPeer,
        ...Array.from(knownPeersRef.current.values()).filter(
          (peer) =>
            activeConnectionIds.includes(peer.peerId) &&
            peer.peerId !== ownerPeerId,
        ),
      ].sort((a, b) => a.clientId.localeCompare(b.clientId))

      const session = {
        epoch: nextEpoch,
        ownerClientId: localClientIdRef.current,
        ownerPeerId,
        peers,
        sessionId,
      }

      latestSessionRef.current = session
      return session
    },
    [connections, remoteIdParam],
  )

  const getCurrentSessionMetadata = useCallback(() => {
    if (!memoRefs.current.isRemote || !memoRefs.current.peerId) {
      return latestSessionRef.current
    }

    return buildSessionMetadata(memoRefs.current.peerId)
  }, [buildSessionMetadata])

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
      } catch (error) {
        debug.log("Error sending presence", error)
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

  const createPeer = () => {
    const newPeer = new PeerConnection({
      onPeerOpen: debug.wrap("usePeer onPeerOpen", () => {
        pushPeerEvent("peer_open")
      }),
      onError: debug.wrap("usePeer onError", (nextError) => {
        const isRetryable = isRetryablePeerError(nextError)
        pushPeerEvent(`peer_error: ${nextError.message}`)

        if (memoRefs.current.remoteIdParam && isRetryable) {
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
                latestSessionRef.current = action.session
              }

              memoRefs.current.onHandleAction(action)
              setHasReceivedInitialSync(true)
              setRemoteLost(false)
              setError(null)

              if (
                memoRefs.current.lifecycleState === "reconnecting" ||
                memoRefs.current.lifecycleState === "failed"
              ) {
                markRecovered()
              } else if (!memoRefs.current.isRemote) {
                setLifecycleState("connected")
              }

              if (
                !memoRefs.current.isRemote &&
                senderId === memoRefs.current.remoteIdParam
              ) {
                void sendPresence(senderId)
              }

              if (memoRefs.current.isRemote) {
                debug.log("is remote, syncing others", senderId, data)
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
        (id: string) => {
          pushPeerEvent(`connection_close: ${id}`)
          knownPeersRef.current.delete(id)

          if (isHostingSession()) {
            syncAllRef.current?.({})
          }

          if (memoRefs.current.remoteIdParam === id) {
            debug.log("remote lost", id)
            setRemoteLost(true)
            setLifecycleState("reconnecting")
          }
        },
      ),
      onConnectionsChange: debug.wrap(
        "usePeer onConnectionsChange",
        (connections: string[]) => {
          pushPeerEvent(`connections_change: ${connections.length}`)
          setConnections(connections)

          const activeConnections = new Set(connections)
          for (const peerId of Array.from(knownPeersRef.current.keys())) {
            if (!activeConnections.has(peerId)) {
              knownPeersRef.current.delete(peerId)
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
      keys,
      state = {},
    }: {
      keys?: string[]
      state?: Partial<TimerState>
    }) => {
      debug.log("usePeer syncAll", { keys, state })
      peer.sendAll(
        getSyncAction({
          params: {
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
          },
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
        } catch (error) {
          const peerErrorType = getPeerErrorType(error)
          if (peerErrorType === PeerErrorType.UnavailableID) {
            return
          }
          if (isRetryablePeerError(error) && attempt < maxAttempts) {
            await wait(400 * attempt)
            continue
          }
          throw error
        }
      }
    },
    [peer],
  )

  const connectRemote = useCallback(
    async (remoteId?: string | null) => {
      recoveryRunIdRef.current += 1
      hasRequestedRemoteConnectionRef.current = true
      setCanRetryManually(false)
      setError(null)
      setIsConnecting(true)
      setLifecycleState(hasConnectedOnce ? "reconnecting" : "connecting")

      try {
        if (!remoteId) {
          const nextPeerId = await createPeerWithRetry()
          if (nextPeerId) {
            latestSessionRef.current = {
              epoch: 0,
              ownerClientId: localClientIdRef.current,
              ownerPeerId: nextPeerId,
              peers: [
                {
                  canControl: true,
                  clientId: localClientIdRef.current,
                  peerId: nextPeerId,
                },
              ],
              sessionId: nextPeerId,
            }
            setLifecycleState("connected")
          }
          return nextPeerId
        }

        const claimedRemoteId =
          canControlSession && !hasConnectedOnce
            ? await createPeerWithRetry(remoteId)
            : undefined

        if (claimedRemoteId) {
          latestSessionRef.current = {
            epoch: (latestSessionRef.current?.epoch ?? -1) + 1,
            ownerClientId: localClientIdRef.current,
            ownerPeerId: claimedRemoteId,
            peers: [
              {
                canControl: true,
                clientId: localClientIdRef.current,
                peerId: claimedRemoteId,
              },
            ],
            sessionId: latestSessionRef.current?.sessionId ?? remoteId,
          }
          setLifecycleState(hasConnectedOnce ? "recovered" : "connected")
          return claimedRemoteId
        }

        const currentPeerId = peer.getPeerId() || (await createPeerWithRetry())
        if (!currentPeerId) {
          return
        }

        await peer.connectPeer(remoteId)
        await sendPresence(remoteId)
        setLifecycleState(hasConnectedOnce ? "recovered" : "connecting")
        return currentPeerId
      } catch (error) {
        debug.error(error)
        const nextError = toError(error)
        if (remoteId) {
          setRemoteLost(true)
          setLifecycleState(hasConnectedOnce ? "reconnecting" : "connecting")
          if (!isRetryablePeerError(error)) {
            setError(nextError)
          }
        } else {
          setError(nextError)
          setLifecycleState("failed")
        }
      } finally {
        setIsConnecting(false)
      }
    },
    [
      canControlSession,
      createPeerWithRetry,
      hasConnectedOnce,
      peer,
      sendPresence,
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
      let nextClaimAttemptAt = INITIAL_CLAIM_DELAY_MS

      setCanRetryManually(false)
      setError(null)
      setIsConnecting(true)
      setLifecycleState("reconnecting")

      while (!isCancelled && recoveryRunIdRef.current === recoveryRunId) {
        const elapsed = Date.now() - startedAt

        if (!remoteIdParam || memoRefs.current.isRemote) {
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
          if (!peer.getPeerId()) {
            await createPeerWithRetry()
          }

          await peer.connectPeer(remoteIdParam)
          await sendPresence(remoteIdParam)
          setIsConnecting(false)
          return
        } catch (error) {
          if (canControlSession && elapsed >= nextClaimAttemptAt) {
            nextClaimAttemptAt += CLAIM_RETRY_MS
            const previousPeerId = peer.getPeerId()
            try {
              const claimedPeerId = await createPeerWithRetry(remoteIdParam)
              if (claimedPeerId === remoteIdParam) {
                latestSessionRef.current = {
                  epoch: (latestSessionRef.current?.epoch ?? -1) + 1,
                  ownerClientId: localClientIdRef.current,
                  ownerPeerId: claimedPeerId,
                  peers: [
                    {
                      canControl: true,
                      clientId: localClientIdRef.current,
                      peerId: claimedPeerId,
                    },
                  ],
                  sessionId:
                    latestSessionRef.current?.sessionId ?? remoteIdParam,
                }
                setRemoteLost(false)
                setIsConnecting(false)
                markRecovered()
                return
              }

              if (
                previousPeerId &&
                previousPeerId !== remoteIdParam &&
                !peer.getPeerId()
              ) {
                await createPeerWithRetry(previousPeerId)
              }
            } catch (claimError) {
              debug.log("Failover claim attempt failed", claimError)
            }
          }

          const peerErrorType = getPeerErrorType(error)
          if (
            peerErrorType &&
            peerErrorType !== PeerErrorType.UnavailableID &&
            !isUnavailablePeerError(error, remoteIdParam) &&
            !isRetryablePeerError(error)
          ) {
            setError(toError(error))
          }
        }

        await wait(1_000)
      }
    }

    recover().catch((error) => {
      debug.error(error)
      setIsConnecting(false)
      setLifecycleState("failed")
      setCanRetryManually(true)
      setError(toError(error))
    })

    return () => {
      isCancelled = true
    }
  }, [
    canControlSession,
    createPeerWithRetry,
    markRecovered,
    peer,
    peerId,
    remoteIdParam,
    remoteLost,
    sendPresence,
  ])

  const allConnectionCount = peer.getAllConnections().length

  useEffect(() => {
    if (
      !remoteIdParam ||
      memoRefs.current.isRemote ||
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
        memoRefs.current.isRemote ||
        memoRefs.current.connections.length > 0
      ) {
        return
      }

      pushPeerEvent("host_link_missing")
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
    lifecycleState,
    pushPeerEvent,
    remoteIdParam,
    remoteLost,
  ])

  const disconnect = useCallback(async () => {
    recoveryRunIdRef.current += 1
    hasRequestedRemoteConnectionRef.current = false
    knownPeersRef.current.clear()
    latestSessionRef.current = null
    setCanRetryManually(false)
    setError(null)
    setHasReceivedInitialSync(false)
    setHasConnectedOnce(false)
    setIsConnecting(false)
    setLifecycleState("connected")
    setRemoteLost(false)
    return peer.closePeerSession()
  }, [peer])

  useEffect(() => {
    return () => {
      window.clearTimeout(recoveredTimeoutRef.current)
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
      lifecycleState,
      peer,
      peerEventTimeline,
      peerId,
      remoteLost,
      retryConnection,
      session: latestSessionRef.current,
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
      syncAll,
    ],
  )
}
