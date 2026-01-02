"use client";

import useParams from "@/utils/useParams";

import useTimer from "@/utils/useTimer";
import Timer from "@/components/Timer";
import SettingsButton from "./SettingsButton";
import usePeer from "@/utils/usePeer";
import Settings from "./Settings";
import CloseButton from "./CloseButton";


export default function Run() {
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
    syncData: {
      title,
      bg,
      fg,
      pc,
      m,
      s
    },
    onAction: (action) => {
      if (action.type === "sync_data") {
        const data = action.data;
        // update params
        setParams({
          title: data.title,
          bg: data.bg,
          fg: data.fg,
          pc: data.pc,
          m: data.m,
          s: data.s
        });
      }
    }
  });
  const { isClient, isRemote } = peerData;

  return isSettingsOpen ? (
    <>
      <Settings
        peerData={peerData}
        paramData={paramData}
        closeSettings={closeSettings}
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
      <div
        className="absolute bottom-0 left-0 p-4 text-foreground/50"
      >
        {isClient ? "Client Mode" : isRemote ? (
          `Remote Mode (${peerData.connections.length} client${peerData.connections.length !== 1 && "s"})`
        ) : ""}
      </div>
    </>
  );
}
