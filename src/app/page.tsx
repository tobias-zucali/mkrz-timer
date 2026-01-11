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
  const syncStateRef = useRef<Partial<TimerState>>({});

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

  const timer = useTimer({
    params: syncParams,
    onAction: (action, state) => {
      // no-op for now
    }
  });
  
  // handle connection
  const peerData = usePeer({
    remoteIdParam,
    syncParamsRef,
    onAction: (action) => {
      if (action.type === "sync") {
        const data = action.data;
        
        const keys = Object.keys(syncParamsRef.current) as Array<keyof SyncParams>
        const syncParams = keys.reduce((prev: Partial<SyncParams> | null, key) => {
          if (Object.hasOwn(data, key) && data[key] !== syncParamsRef.current[key]) {
            return {
              ...(prev || {}),
              [key]: data[key]
            }
          }
          return prev;
        }, null)

        if (syncParams) {
          // update params
          setParams(syncParams);
        }
      }
    }
  });
  
  const { connections, syncAll } = peerData;

  // debounced sync data
  useEffect(() => {
    const handler = setTimeout(() => {
      syncAll({ keys: syncKeys });
    }, 200);

    return () => {
      clearTimeout(handler);
    };
  }, [syncKeys, syncAll]);

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
