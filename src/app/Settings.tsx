"use client";

import useParams from "@/utils/useParams";
import usePeer from "@/utils/usePeer";

import HelpText from "@/components/HelpText";
import InputField from "@/components/InputField";
import CopyField from "@/components/InputField/CopyField";


export default function Settings({
  peerData,
  paramData,
  closeSettings,
  handleChange,
} : {
  peerData: ReturnType<typeof usePeer>;
  paramData: ReturnType<typeof useParams>;
  closeSettings: () => void;
  handleChange: (key: string, value: string) => void;
}) {
  const { params, setParams, getUrlWithParams } =
    paramData;
  const { rid: remoteId } = params;

  const { connectRemote, connections, disconnect, peerId } = peerData;

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
                onChange={(e) => handleChange("title", e.target.value)}
              />
              <InputField
                label="Minutes"
                id="minutes"
                type="number"
                containerClassName="md:w-1/2 px-3"
                value={params.m || 1}
                onChange={(e) => handleChange("m", e.target.value)}
              />
              <InputField
                label="Seconds"
                id="seconds"
                type="number"
                containerClassName="md:w-1/2 px-3"
                value={params.s || 0}
                onChange={(e) => handleChange("s", e.target.value)}
              />
              <InputField
                label="Background Color"
                id="bg"
                type="color"
                containerClassName="md:w-1/3 px-3"
                value={params.bg}
                onChange={(e) => handleChange("bg", e.target.value)}
              />
              <InputField
                label="Foreground Color"
                id="fg"
                type="color"
                containerClassName="md:w-1/3 px-3"
                value={params.fg}
                onChange={(e) => handleChange("fg", e.target.value)}
              />
              <InputField
                label="Primary Color"
                id="pc"
                type="color"
                containerClassName="md:w-1/3 px-3"
                value={params.pc}
                onChange={(e) => handleChange("pc", e.target.value)}
              />
            </div>
            {!remoteId ? (
              <>
                <CopyField
                  label="Timer URL"
                  id="timer_url"
                  containerClassName="px-3"
                  value={getUrlWithParams()}
                />
                <button
                  onClick={(event) => {
                    closeSettings();
                    event.preventDefault();
                  }}
                  className="block mb-8 rounded-lg px-8 py-4 text-center font-bold bg-primary hover:bg-primary/80 text-foreground"
                >
                  Run Timer
                </button>
                <p>
                  <button
                    className="underline cursor-pointer hover:text-primary font-bold"
                    onClick={async (event) => {
                      event.preventDefault();
                      const id = await connectRemote(remoteId);
                      if (!remoteId) {
                        setParams({ rid: id })
                      }
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
                <p>Keep the current window open to control the timer.</p>
                <p>Open as many client windows on as many devices as you want to view the timer.</p>
                <CopyField
                  label="Client URL"
                  id="timer_url"
                  containerClassName="px-3"
                  value={getUrlWithParams(undefined, {
                    rid: peerId,
                  }, false)}
                  showOpenButton={true}
                />
                <p>{connections.length > 0 ? `Connected to ${connections.length} client(s)` : "No clients connected yet."}</p>
                <p>
                  <button
                    className="underline cursor-pointer hover:text-primary font-bold"
                    onClick={(event) => {
                      disconnect();
                      event.preventDefault();
                      setParams({ rid: undefined });
                    }}
                  >
                    End remote mode
                  </button>
                </p>
              </div>
            )}
          </div>
        </form>
        <HelpText />
      </main>
    </div>
  );
}
