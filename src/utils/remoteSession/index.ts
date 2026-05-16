"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import debug from "@/utils/debug"
import type { TimerState } from "@/utils/useTimer"
import type {
  RelayClientMessage,
  RelayConnectionDetails,
  RelaySessionState,
  SessionParticipant,
  SyncParams,
} from "@/shared/remoteSession/types"

import { getRemoteRelayWebSocketUrl } from "./config"
import {
  AUTO_RECOVERY_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  RECOVERED_BADGE_TIMEOUT_MS,
  RETRY_DELAY_MS,
  handleSocketClose,
  handleSocketError,
  toError,
} from "./lifecycle"
import {
  buildHeartbeatMessage,
  buildJoinMessage,
  buildLeaveMessage,
  buildSyncMessage,
  createLocalClientId,
  parseServerMessage,
} from "./protocol"
import { applyServerMessage } from "./state"

export default function useRemoteSession({
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
  onHandleAction: (action: {
    params?: Partial<SyncParams>
    state?: TimerState
  }) => void
}) {
  const [error, setError] = useState<Error | null>(null)
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false)
  const [hasReceivedInitialSync, setHasReceivedInitialSync] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lifecycleState, setLifecycleState] =
    useState<RelaySessionState>("connecting")
  const [canRetryManually, setCanRetryManually] = useState(false)
  const [peerEventTimeline, setPeerEventTimeline] = useState<string[]>([])
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [participants, setParticipants] = useState<SessionParticipant[]>([])
  const canPublishSessionState = canControlSession || !remoteIdParam

  const localClientIdRef = useRef(createLocalClientId())
  const reconnectTimeoutRef = useRef<number | undefined>(undefined)
  const recoveredTimeoutRef = useRef<number | undefined>(undefined)
  const retryEnabledTimeoutRef = useRef<number | undefined>(undefined)
  const socketRef = useRef<WebSocket | null>(null)
  const sessionIdRef = useRef<string | undefined>(undefined)
  const isManualDisconnectRef = useRef(false)
  const hasConnectedOnceRef = useRef(false)
  const openSocketRef = useRef<
    | (({
        nextRemoteId,
        retryType,
      }: {
        nextRemoteId?: string | null
        retryType?: "create-or-join" | "retry-join"
      }) => void)
    | null
  >(null)
  const connectPromiseRef = useRef<{
    reject: (error: Error) => void
    resolve: (sessionId: string) => void
  } | null>(null)

  const pushEvent = useCallback((event: string) => {
    const entry = `${new Date().toISOString()} ${event}`
    setPeerEventTimeline((current) => [...current, entry].slice(-20))
  }, [])

  const clearTimers = useCallback(() => {
    window.clearTimeout(reconnectTimeoutRef.current)
    window.clearTimeout(recoveredTimeoutRef.current)
    window.clearTimeout(retryEnabledTimeoutRef.current)
  }, [])

  const sendMessage = useCallback((message: RelayClientMessage) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false
    }

    socket.send(JSON.stringify(message))
    return true
  }, [])

  const markRecovered = useCallback(() => {
    window.clearTimeout(recoveredTimeoutRef.current)
    setLifecycleState("recovered")
    recoveredTimeoutRef.current = window.setTimeout(() => {
      setLifecycleState("connected")
    }, RECOVERED_BADGE_TIMEOUT_MS)
  }, [])

  const setCurrentSessionId = useCallback((nextSessionId?: string) => {
    setSessionId(nextSessionId)
    sessionIdRef.current = nextSessionId
  }, [])

  const setConnectedOnce = useCallback((nextValue: boolean) => {
    setHasConnectedOnce(nextValue)
    hasConnectedOnceRef.current = nextValue
  }, [])

  const updateParticipants = useCallback(
    (nextParticipants: SessionParticipant[]) => {
      setParticipants(nextParticipants)
    },
    [],
  )

  const closeSocket = useCallback(
    (clearSession = false) => {
      socketRef.current?.close()
      socketRef.current = null
      if (clearSession) {
        setCurrentSessionId(undefined)
        updateParticipants([])
      }
      connectPromiseRef.current = null
    },
    [setCurrentSessionId, updateParticipants],
  )

  const openSocket = useCallback(
    ({
      nextRemoteId,
      retryType = "create-or-join",
    }: {
      nextRemoteId?: string | null
      retryType?: "create-or-join" | "retry-join"
    }) => {
      const relayUrl = getRemoteRelayWebSocketUrl()
      if (!relayUrl) {
        throw new Error("Remote relay URL is not configured.")
      }

      closeSocket(false)
      isManualDisconnectRef.current = false
      setIsConnecting(true)
      setError(null)
      setCanRetryManually(false)
      setLifecycleState(
        hasConnectedOnceRef.current ? "reconnecting" : "connecting",
      )

      const socket = new WebSocket(relayUrl)
      socketRef.current = socket

      socket.addEventListener("open", () => {
        pushEvent("socket_open")
        const joinMessage = buildJoinMessage({
          canControlSession,
          clientId: localClientIdRef.current,
          nextRemoteId,
          retryType,
          syncParams: syncParamsRef.current,
          syncState: syncStateRef.current,
        })
        socket.send(JSON.stringify(joinMessage satisfies RelayClientMessage))
      })

      socket.addEventListener("message", (event) => {
        const message = parseServerMessage(event)
        if (!message) {
          return
        }

        applyServerMessage({
          message,
          context: {
            onError: {
              failConnect: (error) => {
                connectPromiseRef.current?.reject(error)
                connectPromiseRef.current = null
              },
              log: pushEvent,
              setRetryableFailure: (error) => {
                setError(error)
                setLifecycleState("failed")
                setIsConnecting(false)
                setCanRetryManually(true)
              },
            },
            onParticipantList: {
              canPublishSessionState,
              clientId: localClientIdRef.current,
              hasReceivedInitialSync,
              log: pushEvent,
              sendMessage,
              setParticipants: updateParticipants,
              setSessionId: setCurrentSessionId,
              syncParams: syncParamsRef.current,
              syncState: syncStateRef.current,
            },
            onSessionSync: {
              applySnapshot: (snapshot) => {
                syncParamsRef.current = snapshot.params
                syncStateRef.current = snapshot.state
                onHandleAction(snapshot)
              },
              completeConnect: (resolvedSessionId) => {
                connectPromiseRef.current?.resolve(resolvedSessionId)
                connectPromiseRef.current = null
              },
              log: pushEvent,
              markConnected: (wasReconnect) => {
                setConnectedOnce(true)
                setHasReceivedInitialSync(true)
                setIsConnecting(false)
                setError(null)

                if (wasReconnect) {
                  markRecovered()
                } else {
                  setLifecycleState("connected")
                }
              },
              setParticipants: updateParticipants,
              setSessionId: setCurrentSessionId,
            },
            wasReconnect: hasConnectedOnceRef.current,
          },
        })
      })

      socket.addEventListener("close", () => {
        pushEvent("socket_close")
        socketRef.current = null
        updateParticipants([])
        setIsConnecting(false)

        const closeResult = handleSocketClose({
          hasConnectedOnce: hasConnectedOnceRef.current,
          isManualDisconnect: isManualDisconnectRef.current,
          nextRemoteId,
          sessionId: sessionIdRef.current,
        })

        if (closeResult.type === "manual-disconnect") {
          isManualDisconnectRef.current = false
          return
        }

        if (closeResult.type === "failed-before-session") {
          connectPromiseRef.current?.reject(closeResult.error)
          connectPromiseRef.current = null
          setLifecycleState("failed")
          setCanRetryManually(true)
          return
        }

        if (closeResult.error) {
          setError(closeResult.error)
        }

        setLifecycleState(closeResult.lifecycleState)
        retryEnabledTimeoutRef.current = window.setTimeout(() => {
          setCanRetryManually(true)
          setError(
            new Error("Automatic recovery timed out. Retry the connection."),
          )
          setLifecycleState("failed")
        }, AUTO_RECOVERY_TIMEOUT_MS)

        reconnectTimeoutRef.current = window.setTimeout(() => {
          try {
            openSocketRef.current?.({
              nextRemoteId: closeResult.retrySessionId,
              retryType: "retry-join",
            })
          } catch (nextError) {
            setError(toError(nextError))
            setLifecycleState("failed")
            setCanRetryManually(true)
          }
        }, RETRY_DELAY_MS)
      })

      socket.addEventListener("error", () => {
        pushEvent("socket_error")
        setError((current) => handleSocketError({ currentError: current }))
      })
    },
    [
      canControlSession,
      canPublishSessionState,
      closeSocket,
      hasReceivedInitialSync,
      markRecovered,
      onHandleAction,
      pushEvent,
      setConnectedOnce,
      setCurrentSessionId,
      sendMessage,
      syncParamsRef,
      syncStateRef,
      updateParticipants,
    ],
  )
  openSocketRef.current = openSocket

  const connectRemote = useCallback(
    async (nextRemoteId?: string | null) => {
      clearTimers()
      setHasReceivedInitialSync(false)
      const connectPromise = new Promise<string>((resolve, reject) => {
        connectPromiseRef.current = { reject, resolve }
      })
      openSocket({ nextRemoteId })
      return connectPromise
    },
    [clearTimers, openSocket],
  )

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
      const activeSessionId = remoteIdParam || sessionId
      if (!activeSessionId || !canPublishSessionState) {
        return
      }

      const params = includeParams
        ? keys
          ? keys.reduce<Partial<SyncParams>>((current, key) => {
              const value = syncParamsRef.current[key as keyof SyncParams]
              if (value !== undefined) {
                current[key as keyof SyncParams] = value
              }
              return current
            }, {})
          : syncParamsRef.current
        : undefined

      try {
        if (
          !sendMessage(
            buildSyncMessage({
              clientId: localClientIdRef.current,
              params,
              sessionId: activeSessionId,
              state: {
                ...syncStateRef.current,
                ...state,
              },
            }),
          )
        ) {
          return
        }
        pushEvent(`sync_sent: ${activeSessionId}`)
      } catch (nextError) {
        debug.error(nextError)
      }
    },
    [
      pushEvent,
      canPublishSessionState,
      remoteIdParam,
      sendMessage,
      sessionId,
      syncParamsRef,
      syncStateRef,
    ],
  )

  const disconnect = useCallback(async () => {
    const activeSessionId = remoteIdParam || sessionId
    clearTimers()
    isManualDisconnectRef.current = true
    if (activeSessionId) {
      try {
        sendMessage(
          buildLeaveMessage({
            clientId: localClientIdRef.current,
            sessionId: activeSessionId,
          }),
        )
      } catch {}
    }

    closeSocket(true)
    setCanRetryManually(false)
    setError(null)
    setConnectedOnce(false)
    setHasReceivedInitialSync(false)
    setIsConnecting(false)
    setLifecycleState("connected")
  }, [
    clearTimers,
    closeSocket,
    remoteIdParam,
    sendMessage,
    sessionId,
    setConnectedOnce,
  ])

  const retryConnection = useCallback(async () => {
    setCanRetryManually(false)
    setError(null)
    openSocket({
      nextRemoteId: remoteIdParam || sessionId,
      retryType: "retry-join",
    })
  }, [openSocket, remoteIdParam, sessionId])

  useEffect(() => {
    if (!remoteIdParam) {
      return
    }

    openSocketRef.current?.({ nextRemoteId: remoteIdParam })
    return () => {
      clearTimers()
      closeSocket(false)
    }
  }, [clearTimers, closeSocket, remoteIdParam])

  useEffect(() => {
    const activeSessionId = remoteIdParam || sessionId
    if (!activeSessionId) {
      return
    }

    const intervalId = window.setInterval(() => {
      try {
        sendMessage(
          buildHeartbeatMessage({
            clientId: localClientIdRef.current,
            sessionId: activeSessionId,
          }),
        )
      } catch {}
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [remoteIdParam, sendMessage, sessionId])

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  const connectionCount = participants.length
  const connectionDetails = useMemo<RelayConnectionDetails[]>(
    () =>
      participants.map((participant) => ({
        id: participant.clientId,
        isAlive: true,
      })),
    [participants],
  )

  return useMemo(
    () => ({
      canRetryManually,
      connectRemote,
      connectionCount,
      connectionDetails,
      disconnect,
      error,
      hasConnectedOnce,
      hasReceivedInitialSync,
      isConnecting,
      lifecycleState,
      peerEventTimeline,
      participants,
      retryConnection,
      sessionId,
      syncAll,
    }),
    [
      canRetryManually,
      connectRemote,
      connectionCount,
      connectionDetails,
      disconnect,
      error,
      hasConnectedOnce,
      hasReceivedInitialSync,
      isConnecting,
      lifecycleState,
      participants,
      peerEventTimeline,
      retryConnection,
      sessionId,
      syncAll,
    ],
  )
}
