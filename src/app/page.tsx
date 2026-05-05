"use client"
import { Suspense, useEffect, useRef, useState } from "react"

import debug, { IS_DEBUGGING } from "@/utils/debug"
import buildErrorReportBody from "@/utils/buildErrorReportBody"
import useFloatingTimerPiP from "@/utils/useFloatingTimerPiP"
import useParams from "@/utils/useParams"
import { getPeerServerLabel } from "@/utils/usePeer/PeerConnection"
import usePeer, { SyncParams } from "@/utils/usePeer"
import useTimer, { TimerState } from "@/utils/useTimer"

import CloseButton from "@/components/CloseButton"
import Settings from "@/components/Settings"
import SettingsButton from "@/components/SettingsButton"
import Timer from "@/components/Timer"
import Mailto from "@/components/Mailto"

export default function App() {
  return (
    <Suspense fallback={null}>
      <TimerApp />
    </Suspense>
  )
}

function TimerApp() {
  const SETTINGS_TRANSITION_MS = 300
  const syncStateRef = useRef<TimerState>({} as TimerState)

  const paramData = useParams()
  const { params, setParams } = paramData

  const {
    title,
    rid: remoteIdParam,
    bg,
    fg,
    pc,
    m,
    s,
    control,
  } = params

  const syncParams = {
    title,
    bg,
    fg,
    pc,
    m,
    s,
  }

  const syncParamsRef = useRef<SyncParams>(syncParams)
  syncParamsRef.current = syncParams

  const [isSettingsRendered, setIsSettingsRendered] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const closeSettings = () => setIsSettingsOpen(false)
  const openSettings = () => setIsSettingsRendered(true)

  useEffect(() => {
    if (isSettingsRendered) {
      const frameId = window.requestAnimationFrame(() => {
        setIsSettingsOpen(true)
      })

      return () => {
        window.cancelAnimationFrame(frameId)
      }
    }

    setIsSettingsOpen(false)
  }, [isSettingsRendered])

  useEffect(() => {
    if (isSettingsOpen || !isSettingsRendered) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsSettingsRendered(false)
    }, SETTINGS_TRANSITION_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isSettingsOpen, isSettingsRendered])

  const [syncKeys, setSyncKeys] = useState<string[]>([])

  const handleChange = (key: string, value: string) => {
    setParams({ [key]: value })
    setSyncKeys((curr) => [...curr, key])
  }

  const [syncState, setSyncState] = useState<TimerState>({} as TimerState)

  const timer = useTimer({
    params: syncParams,
    syncStateRef,
    shortcutsEnabled: !isSettingsOpen,
    onAction: (_action, state) => {
      setSyncState(state)
    },
  })
  const { setState } = timer
  const { minutes, seconds, isTimedOut, elapsedPercentage } = timer

  // handle connection
  const peerData = usePeer({
    remoteIdParam,
    syncParamsRef,
    syncStateRef,
    onHandleAction: (action) => {
      if (action.type === "sync") {
        if (action.params) {
          setParams(action.params)
        }
        if (action.state) {
          setState(action.state)
        }
      } else {
        // handle other actions if needed
        debug.error("Unhandled action:", action)
      }
    },
  })

  const { connections, peer, syncAll, error, peerId } = peerData

  // debounced sync params
  useEffect(() => {
    const handler = setTimeout(() => {
      syncAll({ keys: syncKeys })
    }, 200)

    return () => {
      clearTimeout(handler)
    }
  }, [syncKeys, syncAll])

  // immediately sync state
  useEffect(() => {
    syncAll({ state: syncState })
  }, [syncState, syncAll])

  const [errorText, setErrorText] = useState<string | null>(null)
  useEffect(() => {
    if (!error) {
      setErrorText(null)
      return
    }

    setErrorText(
      remoteIdParam
        ? `Remote mode has a connection problem. ${error.message}`
        : `Remote mode could not start. ${error.message}`,
    )
  }, [error, remoteIdParam])

  useEffect(() => {
    if (!isSettingsRendered) {
      return
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSettings()
      }
    }

    window.addEventListener("keyup", onKeyUp, false)
    return () => {
      window.removeEventListener("keyup", onKeyUp, false)
    }
  }, [isSettingsRendered])

  const connectionDetails = peer.getAllConnections()
  const peerRole =
    peerData.peerId && peerData.peerId === remoteIdParam ? "main" : "client"
  const peerStatus = peerId ? "connected" : "disconnected"
  const isReadonlyClient = Boolean(remoteIdParam && control !== "42")
  const peerServerLabel = getPeerServerLabel()
  const errorReportBody = buildErrorReportBody({
    errorText,
    remoteIdParam,
    peerId,
    hostPeerId: peerData.peerId,
    peerRole,
    peerStatus,
    isReadonlyClient,
    connectionsCount: connections.length,
    connectionDetails,
    peerServerLabel,
    error,
    params,
    isOnline:
      typeof navigator !== "undefined" ? navigator.onLine : "unavailable",
    visibilityState:
      typeof document !== "undefined"
        ? document.visibilityState
        : "unavailable",
    hasFocus:
      typeof document !== "undefined" ? document.hasFocus() : "unavailable",
    peerEventTimeline: peerData.peerEventTimeline ?? [],
  })
  const floatingTimerData = useFloatingTimerPiP({
    setErrorText,
    state: {
      backgroundColor: bg,
      elapsedPercentage,
      foregroundColor: fg,
      isTimedOut,
      minutes,
      primaryColor: pc,
      seconds,
      title,
    },
  })

  return (
    <>
      {isSettingsRendered && !isReadonlyClient ? (
        <Settings
          floatingTimerData={floatingTimerData}
          isOpen={isSettingsOpen}
          peerData={peerData}
          paramData={paramData}
          closeSettings={closeSettings}
          handleChange={handleChange}
        />
      ) : (
        <>
          <Timer
            isReadonly={isReadonlyClient}
            title={title}
            handleChange={handleChange}
            timer={timer}
          />
          {!isReadonlyClient && <SettingsButton onClick={openSettings} />}
          {remoteIdParam && (
            <div className="absolute bottom-0 left-0 p-4 text-foreground/50">
              {peerData.peerId
                ? peerData.peerId === remoteIdParam
                  ? `Remote Mode, ${connections.length} connected`
                  : "Connected"
                : "Connecting..."}
            </div>
          )}
        </>
      )}
      {errorText && (
        <div
          aria-live="assertive"
          className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-red-700 px-8 py-3 font-bold text-white"
          data-testid="global-error-alert"
          role="alert"
        >
          <CloseButton
            className="absolute inset-0 flex flex-row-reverse p-1 text-white/50 hover:text-white cursor-pointer"
            onClick={() => setErrorText(null)}
          />
          <div className="pr-8">
            {errorText}
            <div className="mt-2 text-sm">
              <Mailto
                email="timer@mkrz.at"
                subject="Error Report"
                body={errorReportBody}
              >
                Report this issue
              </Mailto>
            </div>
          </div>
        </div>
      )}
      {IS_DEBUGGING && (
        <div
          aria-live="polite"
          className="fixed bottom-4 left-4 max-w-full z-50 rounded-xl bg-blue-700/40 px-8 py-3 text-white"
          data-connection-count={connections.length}
          data-peer-id={peerId ?? ""}
          data-peer-role={peerRole}
          data-peer-status={peerStatus}
          data-testid="peer-debug-state"
        >
          <p className="font-bold">
            {peerId ? (
              <>
                {connections.length} Connections,{" "}
                {peerRole === "main" ? "main , " : ""}
                id {peerId.slice(-4)}
              </>
            ) : (
              "Local mode"
            )}
          </p>
          <p className="mt-1 text-sm text-white/80">{peerServerLabel}</p>
          {connectionDetails.length > 0 && (
            <div className="mt-2 text-sm font-bold">
              {connectionDetails.map(({ id, isAlive }) => (
                <p
                  key={id}
                  data-connection-id={id}
                  data-connection-state={isAlive ? "alive" : "lost"}
                  data-testid="peer-debug-connection"
                >{`${id.slice(-4)} (${isAlive ? "alive" : "lost"})`}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
