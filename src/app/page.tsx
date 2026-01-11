"use client";

import useParams from "@/utils/useParams";

import useTimer, { TimerState } from "@/utils/useTimer";
import Timer from "@/components/Timer";
import SettingsButton from "./SettingsButton";
import usePeer, { SyncParams } from "@/utils/usePeer";
import Settings from "./Settings";
import CloseButton from "./CloseButton";
import { useEffect, useRef, useState } from "react";


export default function App() {
  const syncStateRef = useRef<TimerState>({} as TimerState);

  const paramData = useParams();
  const {
    params,
    setParams
  } = paramData;

  const {
    title,
    rid: remoteIdParam,
    settings: isSettingsOpen,
    bg,
    fg,
    pc,
    m,
    s,
  } = params;

  const syncParams = {
    title,
    bg,
    fg,
    pc,
    m,
    s
  };

  const syncParamsRef = useRef<SyncParams>(syncParams);
  // eslint-disable-next-line react-hooks/refs
  syncParamsRef.current = syncParams;

  const closeSettings = () => {
    setParams({ settings: null });
  };
  const openSettings = () => {
    setParams({ settings: "true" });
  };
  
  const [syncKeys, setSyncKeys] = useState<string[]>([]);

  const handleChange = (key: string, value: string) => {
    setParams({ [key]: value });
    setSyncKeys((curr) => ([
      ...curr,
      key
    ]))
  };


  const [syncState, setSyncState] = useState<TimerState>({} as TimerState);

  const timer = useTimer({
    params: syncParams,
    syncStateRef,
    onAction: (_action, state) => {
      setSyncState(state);
    }
  });
  const { setState } = timer;
  
  // handle connection
  const peerData = usePeer({
    remoteIdParam,
    syncParamsRef,
    syncStateRef,
    onHandleAction: (action) => {
      if (action.type === "sync") {
        if (action.params) {
          setParams(action.params);
        }
        if (action.state) {
          setState(action.state);
        }
      } else {
        // handle other actions if needed
        console.error("Unhandled action:", action);
      }
    }
  });
  
  const { connections, syncAll } = peerData;

  // debounced sync params
  useEffect(() => {
    const handler = setTimeout(() => {
      syncAll({ keys: syncKeys });
    }, 200);

    return () => {
      clearTimeout(handler);
    };
  }, [syncKeys, syncAll]);

  // immediately sync state
  useEffect(() => {
    syncAll({ state: syncState })
  }, [syncState, syncAll]);

  return isSettingsOpen ? (
    <>
      <Settings
        peerData={peerData}
        paramData={paramData}
        closeSettings={closeSettings}
        handleChange={handleChange}
      />
      <CloseButton
        onClick={closeSettings}
      />
    </>
  ) : (
    <>
      <Timer
        title={title}
        handleChange={handleChange}
        timer={timer}
      />
      <SettingsButton
        onClick={openSettings}
      />
      {remoteIdParam && (
        <div
          className="absolute bottom-0 left-0 p-4 text-foreground/50"
        >
          {`Remote Mode (${connections.length} connected)`}
        </div>
      )}
    </>
  );
}
