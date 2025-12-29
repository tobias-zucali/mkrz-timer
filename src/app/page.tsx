"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

import useParams from "@/utils/useParams";
import usePeer from "@/utils/usePeer";

import HelpText from "@/components/HelpText";
import InputField from "@/components/InputField";
import CopyField from "@/components/InputField/CopyField";


export default function Home() {
  const { params, setParams, getPathWithParams, getUrlWithParams } =
    useParams();

  const { status, connect, disconnect, error, peerId } = usePeer();
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

  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 sm:items-start">
        <form className="w-full">
          <div className="space-y-12">
            <div className="flex flex-wrap pb-3 -mx-3">
              <InputField
                label="Title"
                id="title"
                containerClassName="px-3"
                value={params.title}
                onChange={(e) => setParams({ title: e.target.value })}
              />
              <InputField
                label="Minutes"
                id="minutes"
                type="number"
                containerClassName="md:w-1/2 px-3"
                value={params.m || 1}
                onChange={(e) => setParams({ m: e.target.value })}
              />
              <InputField
                label="Seconds"
                id="seconds"
                type="number"
                containerClassName="md:w-1/2 px-3"
                value={params.s || 0}
                onChange={(e) => setParams({ s: e.target.value })}
              />
              <InputField
                label="Background Color"
                id="bg"
                type="color"
                containerClassName="md:w-1/3 px-3"
                value={params.bg}
                onChange={(e) => setParams({ bg: e.target.value })}
              />
              <InputField
                label="Foreground Color"
                id="fg"
                type="color"
                containerClassName="md:w-1/3 px-3"
                value={params.fg}
                onChange={(e) => setParams({ fg: e.target.value })}
              />
              <InputField
                label="Primary Color"
                id="p"
                type="color"
                containerClassName="md:w-1/3 px-3"
                value={params.p}
                onChange={(e) => setParams({ p: e.target.value })}
              />
            </div>
            {!isRemote ? (
              <>
                <CopyField
                  label="Timer URL"
                  id="timer_url"
                  containerClassName="px-3"
                  value={getUrlWithParams()}
                />
                <Link
                  href={getPathWithParams("/run")}
                  className="block mb-8 rounded-lg px-8 py-4 text-center font-bold bg-primary hover:bg-primary/80 text-foreground"
                >
                  Run Timer
                </Link>
                <p>
                  <button
                    className="underline cursor-pointer hover:text-primary font-bold"
                    onClick={(event) => {
                      connect();
                      event.preventDefault();
                    }}
                  >
                    Switch to remote mode
                  </button>{" "}
                  in case you want to remote control the timer in another window
                  / on another device.
                </p>
              </>
            ) : (
              <div className="mb-4">
                <p className="text-center text-sm text-foreground/80">
                  Remote peer ID: {peerId}
                </p>
                <p>
                  <button
                    className="underline cursor-pointer hover:text-primary font-bold"
                    onClick={(event) => {
                      disconnect();
                      event.preventDefault();
                    }}
                  >
                    End remote mode
                  </button>
                </p>
              </div>
            )}
            {error && (<div className="bg-red-700 rounded-xl p-3 text-white font-bold">Error: {error.type}</div>)}
          </div>
        </form>
        <HelpText />
      </main>
    </div>
  );
}
