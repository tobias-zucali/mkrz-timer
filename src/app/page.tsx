"use client";

import { useEffect, useRef, useState } from "react";

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
    params: { title, r: remoteId, settings: isSettingsOpen },
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
  const peerData = usePeer();
  const { status, connect, peerId } = peerData;
  const isRemote = status !== "idle";

  const isInitialRender = useRef(true);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      if (remoteId) {
        connect(remoteId);
      }
      return;
    }
    // if (remoteId !== (peerId || "")) {
    //   setParams({ r: peerId || "" });
    // }
  }, [connect, remoteId, peerId, setParams]);

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
    </>
  );
}
