"use client";

import useParams from "@/utils/useParams";

import useTimer from "@/utils/useTimer";
import Timer from "@/components/Timer";
import SettingsButton from "./SettingsButton";
import usePeer, { SyncData } from "@/utils/usePeer";
import Settings from "./Settings";
import CloseButton from "./CloseButton";
import { useEffect, useState } from "react";


export default function App() {
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

  const currentSyncData = {
    title,
    bg,
    fg,
    pc,
    m,
    s
  };

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
    params: currentSyncData,
    onAction: (action, state) => {
      // no-op for now
    }
  });
  
  // handle connection
  const peerData = usePeer({
    remoteIdParam,
    currentSyncData,
    onAction: (action) => {
      if (action.type === "sync") {
        const data = action.data;
        
        const keys = Object.keys(currentSyncData) as Array<keyof SyncData>
        const syncData = keys.reduce((prev: Partial<SyncData> | null, key) => {
          if (Object.hasOwn(data, key) && data[key] !== currentSyncData[key]) {
            return {
              ...(prev || {}),
              [key]: data[key]
            }
          }
          return prev;
        }, null)

        if (syncData) {
          // update params
          setParams(syncData);
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
