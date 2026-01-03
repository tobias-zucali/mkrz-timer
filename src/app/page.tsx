"use client";

import useParams from "@/utils/useParams";

import useTimer from "@/utils/useTimer";
import Timer from "@/components/Timer";
import SettingsButton from "./SettingsButton";
import usePeer, { ClientSyncData } from "@/utils/usePeer";
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
  
  const timer = useTimer(params);
  
  const [syncKeys, setSyncKeys] = useState<string[]>([]);

  const handleChange = (key: string, value: string) => {
    setParams({ [key]: value });
    setSyncKeys((curr) => ([
      ...curr,
      key
    ]))
  };
  
  // handle connection
  const peerData = usePeer({
    remoteIdParam,
    currentSyncData,
    onAction: (action) => {
      if (action.type === "sync_data") {
        const data = action.data;
        
        const keys = Object.keys(currentSyncData) as Array<keyof ClientSyncData>
        const syncData = keys.reduce((prev: Partial<ClientSyncData> | null, key) => {
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
      syncAll(syncKeys);
    }, 200);

    return () => {
      clearTimeout(handler);
    };
  }, [syncKeys, syncAll])

  return isSettingsOpen ? (
    <>
      <Settings
        peerData={peerData}
        paramData={paramData}
        closeSettings={closeSettings}
        handleChange={closeSettings}
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
