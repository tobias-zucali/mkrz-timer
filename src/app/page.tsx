"use client"

import useParams from "@/utils/useParams"

import useTimer, { TimerState } from "@/utils/useTimer"
import Timer from "@/components/Timer"
import SettingsButton from "./SettingsButton"
import usePeer, { SyncParams } from "@/utils/usePeer"
import Settings from "./Settings"
import CloseButton from "./CloseButton"
import { Suspense, useEffect, useRef, useState } from "react"
import debug, { IS_DEBUGGING } from "@/utils/debug"

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

  const {
    title,
    rid: remoteIdParam,
    settings: isSettingsOpen,
    bg,
    fg,
    pc,
    m,
    s,
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

  const closeSettings = () => {
    setParams({ settings: null })
  }
  const openSettings = () => {
    setParams({ settings: "true" })
  }

  const [syncKeys, setSyncKeys] = useState<string[]>([])

  const handleChange = (key: string, value: string) => {
    setParams({ [key]: value })
    setSyncKeys((curr) => [...curr, key])
  }

  const [syncState, setSyncState] = useState<TimerState>({} as TimerState)

  const timer = useTimer({
    params: syncParams,
    syncStateRef,
    onAction: (_action, state) => {
      setSyncState(state)
    },
  })
  const { setState } = timer

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
    setErrorText(error ? error.toString() : null)
  }, [error])

  // if (connections.length !== peer.getConnections().length) {
  //   debug.log("Connections length mismatch", connections, peer.getConnections());
  // }
  // if (connections.length !== peer.getAllConnections().length) {
  //   debug.log("All Connections length mismatch", connections, peer.getAllConnections());
  // }

  const connectionDetails = peer.getAllConnections()
  const peerRole =
    peerData.peerId && peerData.peerId === remoteIdParam ? "main" : "client"
  const peerStatus = peerId ? "connected" : "disconnected"

  return (
    <>
      {isSettingsOpen ? (
        <>
          <Settings
            peerData={peerData}
            paramData={paramData}
            closeSettings={closeSettings}
            handleChange={handleChange}
          />
          <CloseButton onClick={closeSettings} />
        </>
      ) : (
        <>
          <Timer title={title} handleChange={handleChange} timer={timer} />
          <SettingsButton onClick={openSettings} />
          {remoteIdParam && (
            <div className="absolute bottom-0 left-0 p-4 text-foreground/50">
              {peerData.peerId
                ? `Remote Mode (${connections.length} connected${
                    peerData.peerId === remoteIdParam ? ", main" : ""
                  })`
                : "Remote Mode (connecting...)"}
            </div>
          )}
        </>
      )}
      {errorText && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-700 rounded-xl px-8 py-3 text-white font-bold z-50">
          <CloseButton
            className="absolute inset-0 flex flex-row-reverse p-1 text-white/50 hover:text-white cursor-pointer"
            onClick={() => setErrorText(null)}
          />
          {errorText}
        </div>
      )}
      {IS_DEBUGGING && (
        <div
          aria-live="polite"
          className="absolute bottom-4 left-4 right-4 bg-blue-700 rounded-xl px-8 py-3 text-white font-bold z-50"
          data-connection-count={connections.length}
          data-peer-id={peerId ?? ""}
          data-peer-role={peerRole}
          data-peer-status={peerStatus}
          data-testid="peer-debug-state"
        >
          {peerId ? (
            <>
              {connections.length} Connections, {peerRole === "main" ? "main , " : ""}
              id {peerId.slice(-4)}:{" "}
              {connectionDetails.map(({ id, isAlive }) => (
                <p
                  key={id}
                  data-connection-id={id}
                  data-connection-state={isAlive ? "alive" : "lost"}
                  data-testid="peer-debug-connection"
                >{`${id.slice(-4)} (${isAlive ? "alive" : "lost"})`}</p>
              ))}
            </>
          ) : (
            "Not connected"
          )}
        </div>
      )}
    </>
  )
}
