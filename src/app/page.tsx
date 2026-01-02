"use client";

import useParams from "@/utils/useParams";

import useTimer from "@/utils/useTimer";
import Timer from "@/components/Timer";
import SettingsButton from "./SettingsButton";
import usePeer, { ClientSyncData } from "@/utils/usePeer";
import Settings from "./Settings";
import CloseButton from "./CloseButton";


export default function App() {
  const paramData = useParams();
  const {
    params: {
      title,
      pid: peerIdParam,
      rid: remoteIdParam,
      settings: isSettingsOpen,
      bg,
      fg,
      pc,
      m,
      s,
    },
    setParams
  } = paramData;

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
  
  const timer = useTimer();
  
  const handleChange = (key: string, value: string) => {
    setParams({ [key]: value });
  };
  
  // handle connection
  const peerData = usePeer({
    peerIdParam,
    remoteIdParam,
    currentSyncData,
    onAction: (action) => {
      if (action.type === "sync_data") {
        const data = action.data;
        const syncData: Partial<typeof currentSyncData> = {}
        let isNewData = false;

        const keys = Object.keys(currentSyncData) as Array<keyof ClientSyncData>
        keys.forEach((key) => {
          if (data[key] !== currentSyncData[key]) {
            isNewData = true;
            syncData[key] = data[key]
          }
        })

        if (isNewData) {
          // update params
          setParams(syncData);
        }
      }
    }
  });
  const { peerId, connections, syncAll } = peerData;

  return isSettingsOpen ? (
    <>
      <Settings
        peerData={peerData}
        paramData={paramData}
        closeSettings={closeSettings}
        onParamChange={() => {
          syncAll(currentSyncData);
        }}
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
      {peerId && (
        <div
          className="absolute bottom-0 left-0 p-4 text-foreground/50"
        >
          {`Remote Mode (${connections.length} connected)`}
        </div>
      )}
    </>
  );
}
