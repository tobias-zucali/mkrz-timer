"use client"
import { Suspense, useEffect, useRef, useState } from "react"

import debug, { IS_DEBUGGING } from "@/utils/debug"
import useParams from "@/utils/useParams"
import { getPeerServerLabel } from "@/utils/usePeer/PeerConnection"
import usePeer, { SyncParams } from "@/utils/usePeer"
import useTimer, { TimerState } from "@/utils/useTimer"

import CloseButton from "@/components/CloseButton"
import Settings from "@/components/Settings"
import SettingsButton from "@/components/SettingsButton"
import Timer from "@/components/Timer"

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
  const isReadonlyClient = Boolean(remoteIdParam && control !== "42")
  const peerServerLabel = getPeerServerLabel()

  return (
    <>
      {isSettingsOpen && !isReadonlyClient ? (
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
