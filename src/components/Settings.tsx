"use client"

import useParams from "@/utils/useParams"
import usePeer from "@/utils/usePeer"

import HelpText from "@/components/HelpText"
import InputField from "@/components/InputField"
import UrlCopyField from "@/components/UrlCopyField"

const actionLinkClassName =
  "cursor-pointer font-bold underline hover:text-primary"
const primaryButtonClassName =
  "block mb-8 rounded-lg bg-primary px-8 py-4 text-center font-bold text-foreground cursor-pointer hover:bg-primary/80"
const remoteModeStatusClassName = "text-sm text-foreground/70"

export default function Settings({
  peerData,
  paramData,
  closeSettings,
  handleChange,
}: {
  peerData: ReturnType<typeof usePeer>
  paramData: ReturnType<typeof useParams>
  closeSettings: () => void
  handleChange: (key: string, value: string) => void
}) {
  const { params, setParams, getUrlWithParams } = paramData
  const { rid: remoteId } = params

  const { connectRemote, disconnect, isConnecting, peerId } = peerData

  const closeButton = (
    <div className="flex justify-end">
      <button
        onClick={(event) => {
          closeSettings()
          event.preventDefault()
        }}
        className={primaryButtonClassName}
      >
        Close Settings
      </button>
    </div>
  )

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
                <UrlCopyField
                  label="Timer URL"
                  value={getUrlWithParams({ omit: ["settings"] })}
                />
                <p
                  className={remoteModeStatusClassName}
                  data-testid="remote-mode-status"
                >
                  {isConnecting ? "Remote mode is starting..." : "Remote mode is off."}
                </p>
                <p>
                  <button
                    className={actionLinkClassName}
                    disabled={isConnecting}
                    onClick={async () => {
                      const id = await connectRemote()
                      if (!remoteId && id) {
                        setParams({ control: "42", rid: id })
                      }
                    }}
                    type="button"
                  >
                    {isConnecting
                      ? "Starting remote mode..."
                      : "Switch to remote mode"}
                  </button>{" "}
                  in case you want to remote control the timer in another window
                  / on another device.
                </p>
                {closeButton}
              </>
            ) : (
              <>
                {peerData.peerId ? (
                  <div>
                    <p data-testid="remote-mode-status">
                      Remote mode is ready.
                    </p>
                    <p>
                      Open as many client windows on as many devices as you want
                      to view the timer.
                    </p>
                    <UrlCopyField
                      label="Readonly Client URL"
                      value={getUrlWithParams({
                        inherit: false,
                        params: {
                          rid: peerId,
                        },
                      })}
                      showOpenButton={true}
                    />
                    <UrlCopyField
                      label="Control Client URL"
                      value={getUrlWithParams({
                        inherit: false,
                        params: {
                          rid: peerId,
                          control: "42",
                        },
                      })}
                      showOpenButton={true}
                    />
                  </div>
                ) : (
                  <p
                    className={remoteModeStatusClassName}
                    data-testid="remote-mode-status"
                  >
                    {isConnecting
                      ? "Remote mode is starting..."
                      : "Remote mode is connecting to the server..."}
                  </p>
                )}
                <p>
                  <button
                    className={actionLinkClassName}
                    onClick={() => {
                      disconnect()
                      setParams({ control: null, rid: undefined })
                    }}
                    type="button"
                  >
                    End remote mode
                  </button>
                </p>
                {closeButton}
              </>
            )}
          </div>
        </form>
        <HelpText />
      </main>
    </div>
  )
}
