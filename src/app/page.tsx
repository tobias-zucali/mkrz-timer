"use client"
import { Suspense, useEffect, useRef, useState } from "react"

import debug from "@/utils/debug"
import buildErrorReportBody from "@/utils/buildErrorReportBody"
import { getPeerServerLabel } from "@/utils/peerServerConfig"
import useFloatingTimerPiP from "@/utils/useFloatingTimerPiP"
import useParams from "@/utils/useParams"
import getRemoteStatus from "@/utils/remoteStatus"
import useNetworkStatus from "@/utils/useNetworkStatus"
import usePeerServerReachability from "@/utils/usePeerServerReachability"
import usePeer, { SyncParams } from "@/utils/usePeer"
import useTimer, { TimerState } from "@/utils/useTimer"

import CloseButton from "@/components/CloseButton"
import RemoteStatus from "@/components/RemoteStatus"
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
  const syncStateRef = useRef<TimerState>({} as TimerState)

  const paramData = useParams()
  const { params, setParams } = paramData

  const { title, rid: remoteIdParam, bg, fg, pc, m, s, control } = params

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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const closeSettings = () => setIsSettingsOpen(false)
  const openSettings = () => setIsSettingsOpen(true)

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

  const {
    connections,
    hasConnectedOnce,
    isConnecting,
    peer,
    syncAll,
    error,
    peerId,
  } = peerData

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
    if (!isSettingsOpen) {
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
  }, [isSettingsOpen])

  const connectionDetails = peer.getAllConnections()
  const peerRole =
    peerData.peerId && peerData.peerId === remoteIdParam ? "main" : "client"
  const peerStatus = peerId ? "connected" : "disconnected"
  const isReadonlyClient = Boolean(remoteIdParam && control !== "42")
  const isOnline = useNetworkStatus()
  const peerServerLabel = getPeerServerLabel()
  const peerServerReachability = usePeerServerReachability(
    Boolean(remoteIdParam),
  )
  const remoteStatus = getRemoteStatus({
    control,
    connectionDetails,
    connectionsCount: connections.length,
    hasConnectedOnce,
    isConnecting,
    peerId,
    remoteIdParam,
  })
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
    isOnline: isOnline ?? "unavailable",
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
      {!isReadonlyClient && (
        <Settings
          floatingTimerData={floatingTimerData}
          isOpen={isSettingsOpen}
          peerData={peerData}
          paramData={paramData}
          closeSettings={closeSettings}
          handleChange={handleChange}
        />
      )}
      <Timer
        isReadonly={isReadonlyClient}
        title={title}
        handleChange={handleChange}
        timer={timer}
      />
      {!isReadonlyClient && <SettingsButton onClick={openSettings} />}
      {remoteStatus && (
        <RemoteStatus
          connectionCount={connections.length}
          connectionDetails={connectionDetails}
          isOnline={isOnline}
          peerId={peerId}
          peerRole={peerRole}
          peerServerLabel={peerServerLabel}
          peerServerReachability={peerServerReachability}
          peerStatus={peerStatus}
          remoteStatus={remoteStatus}
        />
      )}
      {errorText && (
        <div
          aria-live="assertive"
          className="absolute bottom-4 left-1/2 z-50 max-w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl bg-red-700 py-3 pl-5 pr-14 font-bold text-white sm:pl-6 sm:pr-16"
          data-testid="global-error-alert"
          role="alert"
        >
          <CloseButton
            aria-label="Dismiss error"
            className="absolute right-2 top-1/2 -translate-y-1/2 border-white/25 bg-white/10 text-white/85 hover:bg-white/16 hover:text-white focus:outline-white"
            onClick={() => setErrorText(null)}
          />
          <div>
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
    </>
  )
}
