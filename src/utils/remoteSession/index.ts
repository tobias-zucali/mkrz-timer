"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type {
  RemoteAccessRole,
  RemoteAccessTokenSet,
  RelayClientMessage,
  RelayConnectionDetails,
  RelayServerMessage,
  RelaySessionState,
  SessionSnapshot,
  SessionParticipant,
  SyncParams,
  TimerCommand,
} from "@/shared/remoteSession/types"
import debug from "@/utils/debug"
import type { TimerState } from "@/utils/useTimer"
import {
  resolveSessionSnapshotAt,
  sessionSnapshotsMatch,
  stampSessionSnapshotAt,
} from "@/utils/timerState"
import { decideSnapshotRecovery } from "@/utils/remoteSession/recovery"

import { getRemoteRelayWebSocketUrl } from "./config"
import { selectLocalFallbackSnapshot } from "./fallback"
import {
  AUTO_RECOVERY_TIMEOUT_MS,
  HEARTBEAT_INTERVAL_MS,
  RECOVERED_BADGE_TIMEOUT_MS,
  RETRY_DELAY_MS,
  handleSocketClose,
  handleSocketError,
  toError,
} from "./lifecycle"
import { isPromotedHostControlClient } from "@/utils/timerPage/routeTransition"
import {
  buildHeartbeatMessage,
  buildJoinMessage,
  buildLeaveMessage,
  buildSyncMessage,
  createLocalClientId,
  parseServerMessage,
} from "./protocol"

type LocalFallbackReason =
  | "conflict"
  | "connect-failed"
  | "invalid-session"
  | "reconnect-failed"

export default function useRemoteSession({
  getReconnectSnapshot,
  onIncomingSyncConflict,
  resolveIncomingSnapshot,
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
  resolveIncomingSnapshot?: (payload: {
    snapshot: { params: SyncParams; state: TimerState }
    wasReconnect: boolean
  }) => {
    localSnapshot?: SessionSnapshot
    resolution: "accept-local" | "accept-server" | "conflict"
  }
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
  const [hasPendingLocalChanges, setHasPendingLocalChanges] = useState(false)
  const [localFallbackReason, setLocalFallbackReason] =
    useState<LocalFallbackReason | null>(null)
  const canPublishSessionState =
    remoteRole === "control" || (remoteRole === null && !remoteToken)
  const pendingSessionSyncRef = useRef<{
    message: Extract<RelayServerMessage, { type: "session" | "state-updated" }>
    wasReconnect: boolean
  } | null>(null)
  const lastConfirmedServerSnapshotRef = useRef<SessionSnapshot | null>(null)
  const baseServerSnapshotAtDisconnectRef = useRef<SessionSnapshot | null>(null)
  const pendingLocalSnapshotRef = useRef<SessionSnapshot | null>(null)
  const socketAttemptRef = useRef(0)
  const serverClockOffsetMsRef = useRef(0)

  const localClientIdRef = useRef(createLocalClientId())
  const reconnectTimeoutRef = useRef<number | undefined>(undefined)
  const recoveredTimeoutRef = useRef<number | undefined>(undefined)
  const retryEnabledTimeoutRef = useRef<number | undefined>(undefined)
  const onlineRetryHandlerRef = useRef<(() => void) | null>(null)
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

  const buildCurrentLocalSnapshot = useCallback((): SessionSnapshot => {
    return stampSessionSnapshotAt({
      params: syncParamsRef.current,
      state: syncStateRef.current,
    })
  }, [syncParamsRef, syncStateRef])

  const setPendingLocalSnapshot = useCallback(
    (snapshot: SessionSnapshot | null) => {
      pendingLocalSnapshotRef.current = snapshot
      setHasPendingLocalChanges(snapshot !== null)
    },
    [],
  )

  const clearTimers = useCallback(() => {
    window.clearTimeout(reconnectTimeoutRef.current)
    window.clearTimeout(recoveredTimeoutRef.current)
    window.clearTimeout(retryEnabledTimeoutRef.current)
    if (onlineRetryHandlerRef.current) {
      window.removeEventListener("online", onlineRetryHandlerRef.current)
      onlineRetryHandlerRef.current = null
    }
  }, [])

  const scheduleReconnectAttempt = useCallback(
    ({
      nextRemoteRole,
      nextRemoteToken,
      waitForOnlineOnly = false,
    }: {
      nextRemoteRole: RemoteAccessRole | null
      nextRemoteToken: string | null
      waitForOnlineOnly?: boolean
    }) => {
      window.clearTimeout(reconnectTimeoutRef.current)
      if (onlineRetryHandlerRef.current) {
        window.removeEventListener("online", onlineRetryHandlerRef.current)
        onlineRetryHandlerRef.current = null
      }

      const retry = () => {
        if (onlineRetryHandlerRef.current) {
          window.removeEventListener("online", onlineRetryHandlerRef.current)
          onlineRetryHandlerRef.current = null
        }

        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          onlineRetryHandlerRef.current = retry
          window.addEventListener("online", retry, { once: true })
          return
        }

        try {
          openSocketRef.current?.({
            nextRemoteRole,
            nextRemoteToken,
            retryType: "retry-join-session",
          })
        } catch (nextError) {
          setError(toError(nextError))
          isConnectingRef.current = false
          setIsConnecting(false)
        }
      }

      const isBrowserOffline =
        typeof navigator !== "undefined" && navigator.onLine === false

      if (waitForOnlineOnly || isBrowserOffline) {
        onlineRetryHandlerRef.current = retry
        window.addEventListener("online", retry, { once: true })
        return
      }

      reconnectTimeoutRef.current = window.setTimeout(retry, RETRY_DELAY_MS)
    },
    [],
  )

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

  const clearLocalFallback = useCallback(() => {
    setLocalFallbackReason(null)
  }, [])

  const openLocalFallback = useCallback((reason: LocalFallbackReason) => {
    setLocalFallbackReason(reason)
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

  const applySnapshotLocally = useCallback(
    (snapshot: SessionSnapshot) => {
      const resolvedSnapshot = resolveSessionSnapshotAt(snapshot)
      syncParamsRef.current = resolvedSnapshot.params
      syncStateRef.current = resolvedSnapshot.state
      onHandleAction(resolvedSnapshot)
    },
    [onHandleAction, syncParamsRef, syncStateRef],
  )

  const confirmServerSnapshot = useCallback((snapshot: SessionSnapshot) => {
    lastConfirmedServerSnapshotRef.current = resolveSessionSnapshotAt(snapshot)
  }, [])

  const localizeServerSnapshot = useCallback(
    (snapshot: SessionSnapshot, serverTimestamp: number) => {
      serverClockOffsetMsRef.current = Date.now() - serverTimestamp
      return {
        ...snapshot,
        state: {
          ...snapshot.state,
          anchorServerTimestamp:
            snapshot.state.anchorServerTimestamp > 0
              ? snapshot.state.anchorServerTimestamp +
                serverClockOffsetMsRef.current
              : 0,
          lastUpdatedAt:
            snapshot.state.lastUpdatedAt > 0
              ? snapshot.state.lastUpdatedAt + serverClockOffsetMsRef.current
              : 0,
        },
      }
    },
    [],
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

  const sendSnapshot = useCallback(
    ({
      params,
      sessionId,
      snapshot,
    }: {
      params?: Partial<SyncParams>
      sessionId: string
      snapshot: SessionSnapshot
    }) => {
      return sendMessage(
        buildSyncMessage({
          clientId: localClientIdRef.current,
          params,
          sessionId,
          state: snapshot.state,
        }),
      )
    },
    [sendMessage],
  )

  const sendCommand = useCallback(
    ({ command, sessionId }: { command: TimerCommand; sessionId: string }) =>
      sendMessage(
        buildSyncMessage({
          clientId: localClientIdRef.current,
          command,
          sessionId,
        }),
      ),
    [sendMessage],
  )

  const publishSnapshot = useCallback(
    ({
      params,
      sessionId,
      snapshot,
    }: {
      params?: Partial<SyncParams>
      sessionId: string
      snapshot: SessionSnapshot
    }) => {
      if (
        sendSnapshot({
          params,
          sessionId,
          snapshot,
        })
      ) {
        pushEvent(`sync_sent: ${sessionId}`)
      }
    },
    [pushEvent, sendSnapshot],
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

      const socketAttempt = socketAttemptRef.current + 1
      socketAttemptRef.current = socketAttempt
      const socket = new WebSocket(relayUrl)
      socketRef.current = socket

      socket.addEventListener("open", () => {
        if (socketAttempt !== socketAttemptRef.current) {
          return
        }
        pushEvent("socket_open")
        const retrySnapshot =
          retryType === "retry-join-session"
            ? (getReconnectSnapshot?.() ?? buildCurrentLocalSnapshot())
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
        if (socketAttempt !== socketAttemptRef.current) {
          return
        }

        const message = parseServerMessage(event)
        if (!message) {
          return
        }

        if (message.type === "error") {
          const nextError = new Error(message.message)
          if (retryType === "retry-join-session" && nextRemoteToken) {
            setError(nextError)
            setLifecycleState("reconnecting")
            setIsConnecting(false)
            scheduleReconnectAttempt({
              nextRemoteRole,
              nextRemoteToken,
              waitForOnlineOnly:
                typeof navigator !== "undefined" && navigator.onLine === false,
            })
            pushEvent(`relay_error: ${message.message}`)
            return
          }

          connectPromiseRef.current?.reject(nextError)
          connectPromiseRef.current = null
          isConnectingRef.current = false
          setError(nextError)
          setLifecycleState("failed")
          setIsConnecting(false)
          setCanRetryManually(true)
          if (nextRemoteRole !== null) {
            openLocalFallback(
              /invalid|expired/i.test(message.message)
                ? "invalid-session"
                : hasConnectedOnceRef.current
                  ? "reconnect-failed"
                  : "connect-failed",
            )
          }
          pushEvent(`relay_error: ${message.message}`)
          return
        }

        if (message.type === "participant-list") {
          setCurrentSessionId(message.sessionId)
          updateParticipants(message.participants)
          pushEvent(`participants: ${message.participants.length}`)
          return
        }

        const wasReconnect = hasConnectedOnceRef.current
        const freshServerSnapshot = resolveSessionSnapshotAt(
          localizeServerSnapshot(message.snapshot, message.serverTimestamp),
        )
        const pendingLocalSnapshot = pendingLocalSnapshotRef.current
        const disconnectBaseline = baseServerSnapshotAtDisconnectRef.current
        const initialSnapshotResolution =
          (!hasReceivedInitialSyncRef.current || isConnectingRef.current) &&
          resolveIncomingSnapshot
            ? resolveIncomingSnapshot({
                snapshot: freshServerSnapshot,
                wasReconnect,
              })
            : {
                resolution: "accept-server" as const,
              }

        setCurrentSessionId(message.sessionId)
        if (message.type === "session" && message.accessTokens) {
          setCurrentAccessTokens(message.accessTokens)
        }
        updateParticipants(message.participants)

        if (
          pendingSessionSyncRef.current &&
          pendingSessionSyncRef.current.message.sessionId === message.sessionId
        ) {
          pendingSessionSyncRef.current = {
            message: {
              ...message,
              snapshot: freshServerSnapshot,
            },
            wasReconnect,
          }
          setHasPendingSyncConflict(true)
          onIncomingSyncConflict?.({
            snapshot: freshServerSnapshot,
            wasReconnect,
          })
          confirmServerSnapshot(freshServerSnapshot)
          return
        }

        if (pendingLocalSnapshot && disconnectBaseline) {
          const recovery = decideSnapshotRecovery({
            baselineSnapshot: disconnectBaseline,
            localSnapshot: pendingLocalSnapshot,
            serverSnapshot: freshServerSnapshot,
          })

          if (recovery.resolution === "accept-local") {
            clearLocalFallback()
            resolveConnectPromise({
              ...(message.type === "session" && message.accessTokens
                ? { accessTokens: message.accessTokens }
                : {}),
              sessionId: message.sessionId,
            })
            markSessionConnected(wasReconnect)
            confirmServerSnapshot(freshServerSnapshot)
            publishSnapshot({
              params: pendingLocalSnapshot.params,
              sessionId: message.sessionId,
              snapshot: pendingLocalSnapshot,
            })
            return
          }

          if (recovery.resolution === "accept-server") {
            clearLocalFallback()
            setPendingLocalSnapshot(null)
            applySnapshotLocally(freshServerSnapshot)
            resolveConnectPromise({
              ...(message.type === "session" && message.accessTokens
                ? { accessTokens: message.accessTokens }
                : {}),
              sessionId: message.sessionId,
            })
            markSessionConnected(wasReconnect)
            confirmServerSnapshot(freshServerSnapshot)
            pushEvent(`session_sync: ${message.sessionId}`)
            return
          }

          pendingSessionSyncRef.current = {
            message: {
              ...message,
              snapshot: freshServerSnapshot,
            },
            wasReconnect,
          }
          setHasPendingSyncConflict(true)
          onIncomingSyncConflict?.({
            snapshot: freshServerSnapshot,
            wasReconnect,
          })
          openLocalFallback("conflict")
          confirmServerSnapshot(freshServerSnapshot)
          return
        }

        if (initialSnapshotResolution.resolution === "accept-local") {
          const localSnapshot =
            initialSnapshotResolution.localSnapshot ??
            buildCurrentLocalSnapshot()

          clearLocalFallback()
          applySnapshotLocally(localSnapshot)
          setPendingLocalSnapshot(localSnapshot)
          resolveConnectPromise({
            ...(message.type === "session" && message.accessTokens
              ? { accessTokens: message.accessTokens }
              : {}),
            sessionId: message.sessionId,
          })
          markSessionConnected(wasReconnect)
          confirmServerSnapshot(freshServerSnapshot)
          publishSnapshot({
            params: localSnapshot.params,
            sessionId: message.sessionId,
            snapshot: localSnapshot,
          })
          return
        }

        if (initialSnapshotResolution.resolution === "conflict") {
          if (initialSnapshotResolution.localSnapshot) {
            setPendingLocalSnapshot(initialSnapshotResolution.localSnapshot)
          }
          pendingSessionSyncRef.current = {
            message: {
              ...message,
              snapshot: freshServerSnapshot,
            },
            wasReconnect,
          }
          setHasPendingSyncConflict(true)
          onIncomingSyncConflict?.({
            snapshot: freshServerSnapshot,
            wasReconnect,
          })
          confirmServerSnapshot(freshServerSnapshot)
          return
        }

        applySnapshotLocally(freshServerSnapshot)
        resolveConnectPromise({
          ...(message.type === "session" && message.accessTokens
            ? { accessTokens: message.accessTokens }
            : {}),
          sessionId: message.sessionId,
        })
        markSessionConnected(wasReconnect)
        confirmServerSnapshot(freshServerSnapshot)
        if (
          pendingLocalSnapshot &&
          sessionSnapshotsMatch({
            currentSnapshot: pendingLocalSnapshot,
            incomingSnapshot: freshServerSnapshot,
          })
        ) {
          setPendingLocalSnapshot(null)
        }
        pushEvent(`session_sync: ${message.sessionId}`)
      })

      socket.addEventListener("close", () => {
        if (socketAttempt !== socketAttemptRef.current) {
          return
        }
        pushEvent("socket_close")
        socketRef.current = null
        updateParticipants([])
        isConnectingRef.current = false
        setIsConnecting(false)

        const currentLocalSnapshot = buildCurrentLocalSnapshot()
        const confirmedServerSnapshot = lastConfirmedServerSnapshotRef.current
        if (confirmedServerSnapshot) {
          baseServerSnapshotAtDisconnectRef.current = resolveSessionSnapshotAt(
            confirmedServerSnapshot,
          )
        }
        if (
          canPublishSessionState &&
          confirmedServerSnapshot &&
          !sessionSnapshotsMatch({
            currentSnapshot: confirmedServerSnapshot,
            incomingSnapshot: currentLocalSnapshot,
          })
        ) {
          setPendingLocalSnapshot(currentLocalSnapshot)
        }

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
          if (nextRemoteRole !== null) {
            openLocalFallback("connect-failed")
          }
          return
        }

        if (closeResult.error) {
          setError(closeResult.error)
        }

        setLifecycleState(closeResult.lifecycleState)
        retryEnabledTimeoutRef.current = window.setTimeout(() => {
          const isBrowserOffline =
            typeof navigator !== "undefined" && navigator.onLine === false
          if (isBrowserOffline) {
            return
          }

          setCanRetryManually(true)
        }, AUTO_RECOVERY_TIMEOUT_MS)
        scheduleReconnectAttempt({
          nextRemoteRole: retryRole,
          nextRemoteToken: closeResult.retrySessionId,
          waitForOnlineOnly:
            typeof navigator !== "undefined" && navigator.onLine === false,
        })
      })

      socket.addEventListener("error", () => {
        pushEvent("socket_error")
        setError((current) => handleSocketError({ currentError: current }))
      })
    },
    [
      applySnapshotLocally,
      buildCurrentLocalSnapshot,
      canPublishSessionState,
      clearLocalFallback,
      closeSocket,
      confirmServerSnapshot,
      getReconnectSnapshot,
      getRetryTarget,
      localizeServerSnapshot,
      markSessionConnected,
      onIncomingSyncConflict,
      openLocalFallback,
      pushEvent,
      remoteRole,
      remoteToken,
      resolveConnectPromise,
      publishSnapshot,
      scheduleReconnectAttempt,
      setCurrentAccessTokens,
      setCurrentSessionId,
      setPendingLocalSnapshot,
      resolveIncomingSnapshot,
      syncParamsRef,
      syncStateRef,
      updateParticipants,
    ],
  )
  openSocketRef.current = openSocket

  const connectRemote = useCallback(async () => {
    clearTimers()
    clearLocalFallback()
    setHasReceivedInitialSync(false)
    const connectPromise = new Promise<{
      accessTokens?: RemoteAccessTokenSet
      sessionId: string
    }>((resolve, reject) => {
      connectPromiseRef.current = { reject, resolve }
    })
    openSocket({ retryType: "create-session" })
    return connectPromise
  }, [clearLocalFallback, clearTimers, openSocket])

  const activeSessionId = sessionId

  const finalizePendingSync = useCallback(
    (resolution: "use-local" | "use-local-mode" | "use-server") => {
      const pendingSync = pendingSessionSyncRef.current
      if (!pendingSync) {
        return
      }

      clearPendingSyncConflict()
      if (resolution === "use-local-mode") {
        openLocalFallback("conflict")
        return
      }

      if (resolution === "use-server") {
        applySnapshotLocally(pendingSync.message.snapshot)
        setPendingLocalSnapshot(null)
        clearLocalFallback()
      } else {
        clearLocalFallback()
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
        setPendingLocalSnapshot(buildCurrentLocalSnapshot())
        publishSnapshot({
          params: syncParamsRef.current,
          sessionId: pendingSync.message.sessionId,
          snapshot: buildCurrentLocalSnapshot(),
        })
      }
    },
    [
      applySnapshotLocally,
      buildCurrentLocalSnapshot,
      canPublishSessionState,
      clearLocalFallback,
      clearPendingSyncConflict,
      markSessionConnected,
      openLocalFallback,
      publishSnapshot,
      resolveConnectPromise,
      setPendingLocalSnapshot,
      syncParamsRef,
    ],
  )

  const syncAll = useCallback(
    ({
      command,
      includeParams = true,
      keys,
      state = {},
    }: {
      command?: TimerCommand
      includeParams?: boolean
      keys?: string[]
      state?: Partial<TimerState>
    }) => {
      if (!canPublishSessionState) {
        return
      }

      const params = includeParams
        ? keys
          ? keys.reduce<Partial<SyncParams>>((current, key) => {
              const value = syncParamsRef.current[key as keyof SyncParams]
              if (value !== undefined) {
                ;(current as Record<string, unknown>)[key] = value
              }
              return current
            }, {})
          : syncParamsRef.current
        : undefined
      const snapshot = stampSessionSnapshotAt({
        params: {
          ...syncParamsRef.current,
          ...(params ?? {}),
        },
        state: {
          ...syncStateRef.current,
          ...state,
        },
      })

      if (
        !activeSessionId ||
        hasPendingSyncConflict ||
        isConnectingRef.current
      ) {
        setPendingLocalSnapshot(snapshot)
        return
      }

      try {
        const didSend = command
          ? sendCommand({ command, sessionId: activeSessionId })
          : sendSnapshot({ params, sessionId: activeSessionId, snapshot })

        if (!didSend) {
          setPendingLocalSnapshot(snapshot)
          return
        }
        clearLocalFallback()
        pushEvent(
          command
            ? `command_sent: ${command.type} ${activeSessionId}`
            : `sync_sent: ${activeSessionId}`,
        )
      } catch (nextError) {
        debug.error(nextError)
        setPendingLocalSnapshot(snapshot)
      }
    },
    [
      activeSessionId,
      canPublishSessionState,
      clearLocalFallback,
      hasPendingSyncConflict,
      pushEvent,
      sendCommand,
      sendSnapshot,
      setPendingLocalSnapshot,
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
    clearLocalFallback()
    setPendingLocalSnapshot(null)
    lastConfirmedServerSnapshotRef.current = null
    baseServerSnapshotAtDisconnectRef.current = null
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
    clearLocalFallback,
    clearPendingSyncConflict,
    clearTimers,
    closeSocket,
    sendMessage,
    setPendingLocalSnapshot,
    setConnectedOnce,
  ])

  const activateLocalFallback = useCallback(async () => {
    const snapshot = selectLocalFallbackSnapshot({
      currentLocalSnapshot: buildCurrentLocalSnapshot(),
      lastConfirmedServerSnapshot: lastConfirmedServerSnapshotRef.current,
      pendingLocalSnapshot: pendingLocalSnapshotRef.current,
      pendingServerSnapshot:
        pendingSessionSyncRef.current?.message.snapshot ?? null,
    })

    clearPendingSyncConflict()
    clearLocalFallback()
    await disconnect()
    return resolveSessionSnapshotAt(snapshot)
  }, [
    buildCurrentLocalSnapshot,
    clearLocalFallback,
    clearPendingSyncConflict,
    disconnect,
  ])

  const retryConnection = useCallback(async () => {
    const { retryRole, retryToken } = getRetryTarget({
      nextRemoteRole: remoteRole,
      nextRemoteToken: remoteToken,
    })

    setCanRetryManually(false)
    setError(null)
    clearLocalFallback()
    openSocket({
      nextRemoteRole: retryRole,
      nextRemoteToken: retryToken,
      retryType: retryToken ? "retry-join-session" : "create-session",
    })
  }, [clearLocalFallback, getRetryTarget, openSocket, remoteRole, remoteToken])

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
  const connectionDetails = useMemo<RelayConnectionDetails[]>(() => {
    const localClientId = localClientIdRef.current

    const getParticipantSortRank = (participant: SessionParticipant) => {
      const isLocalClient = participant.clientId === localClientId

      if (remoteRole === null) {
        return isLocalClient ? 0 : participant.canControl ? 1 : 2
      }

      if (remoteRole === "control") {
        if (isPromotedHostControlClient()) {
          return isLocalClient ? 0 : participant.canControl ? 1 : 2
        }

        return participant.canControl && !isLocalClient
          ? 0
          : isLocalClient
            ? 1
            : 2
      }

      return participant.canControl ? 0 : isLocalClient ? 2 : 1
    }

    return participants
      .map((participant, index) => ({
        index,
        participant,
      }))
      .sort(
        (left, right) =>
          getParticipantSortRank(left.participant) -
            getParticipantSortRank(right.participant) ||
          left.index - right.index,
      )
      .map(({ participant }) => ({
        id: participant.clientId,
        isAlive: true,
        participantLabel:
          participant.clientId === localClientId
            ? "You"
            : participant.canControl
              ? "Control"
              : "View",
      }))
  }, [participants, remoteRole])

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
      hasPendingLocalChanges,
      hasPendingSyncConflict,
      hasReceivedInitialSync,
      isConnecting,
      lifecycleState,
      localFallbackReason,
      localClientId: localClientIdRef.current,
      peerEventTimeline,
      participants,
      resolvePendingSyncConflict: finalizePendingSync,
      retryConnection,
      sessionId,
      syncAll,
      activateLocalFallback,
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
      hasPendingLocalChanges,
      hasPendingSyncConflict,
      hasReceivedInitialSync,
      isConnecting,
      lifecycleState,
      localFallbackReason,
      participants,
      peerEventTimeline,
      finalizePendingSync,
      retryConnection,
      sessionId,
      syncAll,
      activateLocalFallback,
    ],
  )
}
