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
  const { params, setParams } = useParams();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { title } = params;
  
  const timer = useTimer();
  
  useEffect(() => {
    // initially set params
    setParams({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
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
      if (params.r) {
        connect(params.r);
      }
      return;
    }
    if (params.r !== (peerId || "")) {
      setParams({ r: peerId || "" });
    }
  }, [connect, params.r, peerId, setParams]);

  return isSettingsOpen ? (
    <>
      <Settings
        peerData={peerData}
        paramData={paramData}
      />
      <CloseButton
        onClick={() => {
          setIsSettingsOpen(false);
        }}
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
        onClick={() => {
          setIsSettingsOpen(true);
        }}
      />
    </>
  );
}
