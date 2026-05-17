"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type {
  RemoteAccessRole,
  RemoteAccessTokenSet,
  RelayClientMessage,
  RelayConnectionDetails,
  RelayServerMessage,
  RelaySessionState,
  SessionParticipant,
  SyncParams,
} from "@/shared/remoteSession/types"
import debug from "@/utils/debug"
import type { TimerState } from "@/utils/useTimer"

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
  getReconnectSnapshot,
  onIncomingSyncConflict,
  shouldDeferIncomingSnapshot,
  remoteRole,
  remoteToken,
  syncParamsRef,
  syncStateRef,
  onHandleAction,
}: {
  getReconnectSnapshot?: () => {
    params: SyncParams
    state: TimerState
  }
  onIncomingSyncConflict?: (payload: {
    snapshot: { params: SyncParams; state: TimerState }
    wasReconnect: boolean
  }) => void
  shouldDeferIncomingSnapshot?: (payload: {
    snapshot: { params: SyncParams; state: TimerState }
    wasReconnect: boolean
  }) => boolean
  remoteRole: RemoteAccessRole | null
  remoteToken: string | null
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
  const [accessTokens, setAccessTokens] = useState<
    RemoteAccessTokenSet | undefined
  >(undefined)
  const [hasPendingSyncConflict, setHasPendingSyncConflict] = useState(false)
  const canPublishSessionState =
    remoteRole === "control" || (remoteRole === null && !remoteToken)
  const pendingSessionSyncRef = useRef<{
    message: Extract<RelayServerMessage, { type: "session" | "state-updated" }>
    wasReconnect: boolean
  } | null>(null)

  const localClientIdRef = useRef(createLocalClientId())
  const reconnectTimeoutRef = useRef<number | undefined>(undefined)
  const recoveredTimeoutRef = useRef<number | undefined>(undefined)
  const retryEnabledTimeoutRef = useRef<number | undefined>(undefined)
  const socketRef = useRef<WebSocket | null>(null)
  const sessionIdRef = useRef<string | undefined>(undefined)
  const accessTokensRef = useRef<RemoteAccessTokenSet | undefined>(undefined)
  const hasReceivedInitialSyncRef = useRef(false)
  const isManualDisconnectRef = useRef(false)
  const isConnectingRef = useRef(false)
  const hasConnectedOnceRef = useRef(false)
  const openSocketRef = useRef<
    | (({
        nextRemoteRole,
        nextRemoteToken,
        retryType,
      }: {
        nextRemoteRole?: RemoteAccessRole | null
        nextRemoteToken?: string | null
        retryType?: "create-session" | "join-session" | "retry-join-session"
      }) => void)
    | null
  >(null)
  const connectPromiseRef = useRef<{
    reject: (error: Error) => void
    resolve: (result: {
      accessTokens?: RemoteAccessTokenSet
      sessionId: string
    }) => void
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

  const setCurrentAccessTokens = useCallback(
    (nextAccessTokens?: RemoteAccessTokenSet) => {
      setAccessTokens(nextAccessTokens)
      accessTokensRef.current = nextAccessTokens
    },
    [],
  )

  const setConnectedOnce = useCallback((nextValue: boolean) => {
    setHasConnectedOnce(nextValue)
    hasConnectedOnceRef.current = nextValue
  }, [])

  const resolveConnectPromise = useCallback(
    (result: { accessTokens?: RemoteAccessTokenSet; sessionId: string }) => {
      connectPromiseRef.current?.resolve(result)
      connectPromiseRef.current = null
    },
    [],
  )

  const updateParticipants = useCallback(
    (nextParticipants: SessionParticipant[]) => {
      setParticipants(nextParticipants)
    },
    [],
  )

  const clearPendingSyncConflict = useCallback(() => {
    pendingSessionSyncRef.current = null
    setHasPendingSyncConflict(false)
  }, [])

  const markSessionConnected = useCallback(
    (wasReconnect: boolean) => {
      setConnectedOnce(true)
      hasReceivedInitialSyncRef.current = true
      isConnectingRef.current = false
      setHasReceivedInitialSync(true)
      setIsConnecting(false)
      setError(null)

      if (wasReconnect) {
        markRecovered()
        return
      }

      setLifecycleState("connected")
    },
    [markRecovered, setConnectedOnce],
  )

  const getRetryTarget = useCallback(
    ({
      nextRemoteRole,
      nextRemoteToken,
    }: {
      nextRemoteRole?: RemoteAccessRole | null
      nextRemoteToken?: string | null
    }) => {
      if (nextRemoteToken) {
        return {
          retryRole: nextRemoteRole ?? "control",
          retryToken: nextRemoteToken,
        }
      }

      const accessToken =
        nextRemoteRole === "readonly"
          ? accessTokensRef.current?.readonly
          : accessTokensRef.current?.control

      return {
        retryRole: nextRemoteRole ?? (accessToken ? "control" : null),
        retryToken: accessToken ?? null,
      }
    },
    [],
  )

  const closeSocket = useCallback(
    (clearSession = false) => {
      socketRef.current?.close()
      socketRef.current = null
      if (clearSession) {
        setCurrentSessionId(undefined)
        setCurrentAccessTokens(undefined)
        updateParticipants([])
      }
      connectPromiseRef.current = null
    },
    [setCurrentAccessTokens, setCurrentSessionId, updateParticipants],
  )

  const openSocket = useCallback(
    ({
      nextRemoteRole = remoteRole,
      nextRemoteToken = remoteToken,
      retryType = nextRemoteToken ? "join-session" : "create-session",
    }: {
      nextRemoteRole?: RemoteAccessRole | null
      nextRemoteToken?: string | null
      retryType?: "create-session" | "join-session" | "retry-join-session"
    }) => {
      const relayUrl = getRemoteRelayWebSocketUrl()
      if (!relayUrl) {
        throw new Error("Remote relay URL is not configured.")
      }

      closeSocket(false)
      isManualDisconnectRef.current = false
      hasReceivedInitialSyncRef.current = false
      isConnectingRef.current = true
      setHasReceivedInitialSync(false)
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
        const retrySnapshot =
          retryType === "retry-join-session" && getReconnectSnapshot
            ? getReconnectSnapshot()
            : null
        const joinMessage = buildJoinMessage({
          clientId: localClientIdRef.current,
          remoteRole: nextRemoteRole,
          remoteToken: nextRemoteToken,
          retryType,
          syncParams: retrySnapshot?.params ?? syncParamsRef.current,
          syncState: retrySnapshot?.state ?? syncStateRef.current,
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
              failConnect: (nextError) => {
                connectPromiseRef.current?.reject(nextError)
                connectPromiseRef.current = null
              },
              log: pushEvent,
              setRetryableFailure: (nextError) => {
                isConnectingRef.current = false
                setError(nextError)
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
              completeConnect: (resolvedSessionId, nextAccessTokens) => {
                resolveConnectPromise({
                  ...(nextAccessTokens
                    ? { accessTokens: nextAccessTokens }
                    : {}),
                  sessionId: resolvedSessionId,
                })
              },
              deferSnapshot: ({ message: deferredMessage, wasReconnect }) => {
                pendingSessionSyncRef.current = {
                  message: deferredMessage,
                  wasReconnect,
                }
                setHasPendingSyncConflict(true)
                setCurrentSessionId(deferredMessage.sessionId)
                if (
                  deferredMessage.type === "session" &&
                  deferredMessage.accessTokens
                ) {
                  setCurrentAccessTokens(deferredMessage.accessTokens)
                }
                updateParticipants(deferredMessage.participants)
                onIncomingSyncConflict?.({
                  snapshot: deferredMessage.snapshot,
                  wasReconnect,
                })
              },
              log: pushEvent,
              markConnected: markSessionConnected,
              setAccessTokens: setCurrentAccessTokens,
              setParticipants: updateParticipants,
              setSessionId: setCurrentSessionId,
              shouldDeferSnapshot: ({ snapshot, wasReconnect }) =>
                ((!hasReceivedInitialSyncRef.current ||
                  isConnectingRef.current) &&
                  (shouldDeferIncomingSnapshot?.({
                    snapshot,
                    wasReconnect,
                  }) ??
                    false)) ||
                false,
            },
            wasReconnect: hasConnectedOnceRef.current,
          },
        })
      })

      socket.addEventListener("close", () => {
        pushEvent("socket_close")
        socketRef.current = null
        updateParticipants([])
        isConnectingRef.current = false
        setIsConnecting(false)

        const { retryRole, retryToken } = getRetryTarget({
          nextRemoteRole,
          nextRemoteToken,
        })

        const closeResult = handleSocketClose({
          hasConnectedOnce: hasConnectedOnceRef.current,
          isManualDisconnect: isManualDisconnectRef.current,
          nextRemoteId: retryToken,
          sessionId: sessionIdRef.current,
        })

        if (closeResult.type === "manual-disconnect") {
          isManualDisconnectRef.current = false
          return
        }

        if (closeResult.type === "failed-before-session") {
          connectPromiseRef.current?.reject(closeResult.error)
          connectPromiseRef.current = null
          isConnectingRef.current = false
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
          isConnectingRef.current = false
          setLifecycleState("failed")
        }, AUTO_RECOVERY_TIMEOUT_MS)

        reconnectTimeoutRef.current = window.setTimeout(() => {
          try {
            openSocketRef.current?.({
              nextRemoteRole: retryRole,
              nextRemoteToken: closeResult.retrySessionId,
              retryType: "retry-join-session",
            })
          } catch (nextError) {
            setError(toError(nextError))
            isConnectingRef.current = false
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
      canPublishSessionState,
      closeSocket,
      getReconnectSnapshot,
      getRetryTarget,
      hasReceivedInitialSync,
      markSessionConnected,
      onHandleAction,
      onIncomingSyncConflict,
      pushEvent,
      remoteRole,
      remoteToken,
      resolveConnectPromise,
      sendMessage,
      setCurrentAccessTokens,
      setCurrentSessionId,
      shouldDeferIncomingSnapshot,
      syncParamsRef,
      syncStateRef,
      updateParticipants,
    ],
  )
  openSocketRef.current = openSocket

  const connectRemote = useCallback(async () => {
    clearTimers()
    setHasReceivedInitialSync(false)
    const connectPromise = new Promise<{
      accessTokens?: RemoteAccessTokenSet
      sessionId: string
    }>((resolve, reject) => {
      connectPromiseRef.current = { reject, resolve }
    })
    openSocket({ retryType: "create-session" })
    return connectPromise
  }, [clearTimers, openSocket])

  const activeSessionId = sessionId

  const finalizePendingSync = useCallback(
    (resolution: "use-local" | "use-server") => {
      const pendingSync = pendingSessionSyncRef.current
      if (!pendingSync) {
        return
      }

      clearPendingSyncConflict()

      if (resolution === "use-server") {
        syncParamsRef.current = pendingSync.message.snapshot.params
        syncStateRef.current = pendingSync.message.snapshot.state
        onHandleAction(pendingSync.message.snapshot)
      }

      resolveConnectPromise({
        ...(pendingSync.message.type === "session" &&
        pendingSync.message.accessTokens
          ? { accessTokens: pendingSync.message.accessTokens }
          : {}),
        sessionId: pendingSync.message.sessionId,
      })
      markSessionConnected(pendingSync.wasReconnect)

      if (resolution === "use-local" && canPublishSessionState) {
        const params = syncParamsRef.current
        const state = syncStateRef.current
        if (
          sendMessage(
            buildSyncMessage({
              clientId: localClientIdRef.current,
              params,
              sessionId: pendingSync.message.sessionId,
              state,
            }),
          )
        ) {
          pushEvent(`sync_sent: ${pendingSync.message.sessionId}`)
        }
      }
    },
    [
      canPublishSessionState,
      clearPendingSyncConflict,
      markSessionConnected,
      onHandleAction,
      pushEvent,
      resolveConnectPromise,
      sendMessage,
      syncParamsRef,
      syncStateRef,
    ],
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
      activeSessionId,
      canPublishSessionState,
      pushEvent,
      sendMessage,
      syncParamsRef,
      syncStateRef,
    ],
  )

  const disconnect = useCallback(async () => {
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
    clearPendingSyncConflict()
    hasReceivedInitialSyncRef.current = false
    isConnectingRef.current = false
    setCanRetryManually(false)
    setError(null)
    setConnectedOnce(false)
    setHasReceivedInitialSync(false)
    setIsConnecting(false)
    setLifecycleState("connected")
  }, [
    activeSessionId,
    clearPendingSyncConflict,
    clearTimers,
    closeSocket,
    sendMessage,
    setConnectedOnce,
  ])

  const retryConnection = useCallback(async () => {
    const { retryRole, retryToken } = getRetryTarget({
      nextRemoteRole: remoteRole,
      nextRemoteToken: remoteToken,
    })

    setCanRetryManually(false)
    setError(null)
    openSocket({
      nextRemoteRole: retryRole,
      nextRemoteToken: retryToken,
      retryType: retryToken ? "retry-join-session" : "create-session",
    })
  }, [getRetryTarget, openSocket, remoteRole, remoteToken])

  useEffect(() => {
    if (!remoteToken || !remoteRole) {
      return
    }

    openSocketRef.current?.({
      nextRemoteRole: remoteRole,
      nextRemoteToken: remoteToken,
      retryType: "join-session",
    })
    return () => {
      clearTimers()
      closeSocket(false)
    }
  }, [clearTimers, closeSocket, remoteRole, remoteToken])

  useEffect(() => {
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
  }, [activeSessionId, sendMessage])

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
      accessTokens,
      canRetryManually,
      connectRemote,
      connectionCount,
      connectionDetails,
      disconnect,
      error,
      hasConnectedOnce,
      hasPendingSyncConflict,
      hasReceivedInitialSync,
      isConnecting,
      lifecycleState,
      peerEventTimeline,
      participants,
      resolvePendingSyncConflict: finalizePendingSync,
      retryConnection,
      sessionId,
      syncAll,
    }),
    [
      accessTokens,
      canRetryManually,
      connectRemote,
      connectionCount,
      connectionDetails,
      disconnect,
      error,
      hasConnectedOnce,
      hasPendingSyncConflict,
      hasReceivedInitialSync,
      isConnecting,
      lifecycleState,
      participants,
      peerEventTimeline,
      finalizePendingSync,
      retryConnection,
      sessionId,
      syncAll,
    ],
  )
}
