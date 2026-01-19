"use client"

import useParams from "@/utils/useParams"

import useTimer, { TimerState } from "@/utils/useTimer"
import Timer from "@/components/Timer"
import SettingsButton from "./SettingsButton"
import usePeer, { SyncParams } from "@/utils/usePeer"
import Settings from "./Settings"
import CloseButton from "./CloseButton"
import { useEffect, useRef, useState } from "react"
import debug, { IS_DEBUGGING } from "@/utils/debug"

export default function App() {
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
  // eslint-disable-next-line react-hooks/refs
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
        <div className="absolute bottom-4 left-4 right-4 bg-blue-700 rounded-xl px-8 py-3 text-white font-bold z-50">
          {connections.length} Connections,{" "}
          {peerData.peerId === remoteIdParam ? "main , " : ""}me {peerId}):{" "}
          {peer.getAllConnections().map(({ id, isAlive }) => (
            <p key={id}>{`${id} (${isAlive ? "alive" : "lost"})`}</p>
          ))}
        </div>
      )}
    </>
  )
}
