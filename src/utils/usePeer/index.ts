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

const getSyncAction = ({
  params,
  connections,
  state,
}: {
  params: Partial<SyncParams>
  connections: string[]
  state?: TimerState
}) => ({
  type: "sync",
  params,
  connections,
  state,
})

export type SyncAction = ReturnType<typeof getSyncAction>

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

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error))

const wait = (delay: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, delay)
  })

export default function usePeer({
  remoteIdParam,
  syncParamsRef,
  syncStateRef,
  onHandleAction,
}: {
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

  const isRemote = peerId && remoteIdParam === peerId

  const currentMemoRefs = {
    connections,
    onHandleAction,
    remoteIdParam,
    isRemote,
  }
  const memoRefs = useRef(currentMemoRefs)
  memoRefs.current = currentMemoRefs

  const createPeer = () => {
    const newPeer = new PeerConnection({
      onError: debug.wrap("usePeer onError", setError),
      onOpen: debug.wrap("usePeer onOpen", () => {}),
      onConnection: debug.wrap("usePeer onConnection", (senderId: string) => {
        newPeer.send(
          senderId,
          getSyncAction({
            params: syncParamsRef.current,
            connections: newPeer.getConnections(),
            state: syncStateRef.current,
          }),
        )
      }),
      onReceiveData: debug.wrap(
        "usePeer onReceiveData",
        (senderId: string, data: unknown) => {
          if (data && typeof data === "object" && "type" in data) {
            switch (data.type) {
              case "sync": {
                const action = data as SyncAction

                memoRefs.current.onHandleAction(action)
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
          }
        },
      ),
      onClose: debug.wrap("usePeer onClose", (id?: string) => {
        debug.log("Peer closed", id)
        setPeerId(undefined)
      }),
      onConnectionClose: debug.wrap(
        "usePeer onConnectionClose",
        (id: string) => {
          if (memoRefs.current.remoteIdParam === id) {
            debug.log("remote lost", id)
            setRemoteLost(true)
          }
        },
      ),
      onConnectionsChange: debug.wrap(
        "usePeer onConnectionsChange",
        (connections: string[]) => {
          setConnections(connections)
        },
      ),
    })
    // window.peer = newPeer;
    return newPeer
  }

  const [peer] = useState<PeerConnection>(() => createPeer())

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
          state: {
            ...state,
            ...syncStateRef.current,
          },
        }),
      )
    },
    [syncParamsRef, syncStateRef, peer],
  )

  const connectRemote = useCallback(
    async (remoteId?: string | null) => {
      const createPeerWithRetry = async (id?: string) => {
        const maxAttempts = 3

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            const peerId = await peer.createPeer(id, true)
            return peerId
          } catch (error) {
            const peerErrorType = getPeerErrorType(error)
            if (peerErrorType) {
              if (peerErrorType === PeerErrorType.UnavailableID) {
                return
              }
              if (isRetryablePeerError(error) && attempt < maxAttempts) {
                await wait(500 * attempt)
                continue
              }
            }
            throw error
          }
        }
      }

      const startSession = async (id: string) => createPeerWithRetry(id)
      const startFreshSession = async () => createPeerWithRetry()

      let peerId: string | undefined

      setError(null)
      setIsConnecting(true)

      try {
        if (remoteId) {
          peerId = await startSession(remoteId)
        }

        if (!peerId) {
          // fall back to fresh id
          peerId = await startFreshSession()
        }

        if (peerId && remoteId && peerId !== remoteId) {
          await peer.connectPeer(remoteId)
        }
        setError(null)
        setPeerId(peerId)
        return peerId
      } catch (error) {
        debug.error(error)
        setError(toError(error))
      } finally {
        setIsConnecting(false)
      }
    },
    [peer],
  )

  useEffect(() => {
    if (remoteIdParam) {
      connectRemote(remoteIdParam)
    }
    return () => {
      peer.closePeerSession()
    }
    // initial render only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (remoteLost) {
      debug.log("Reconnecting to remote peer...", remoteIdParam)
      if (remoteIdParam) {
        connectRemote(remoteIdParam)
      }
      setRemoteLost(false)
    }
  }, [remoteLost, remoteIdParam, connectRemote])

  return useMemo(
    () => ({
      connectRemote,
      connections,
      peer: peer,
      disconnect: () => peer.closePeerSession(),
      error,
      isConnecting,
      peerId,
      syncAll,
    }),
    [connectRemote, connections, error, isConnecting, peer, peerId, syncAll],
  )
}
