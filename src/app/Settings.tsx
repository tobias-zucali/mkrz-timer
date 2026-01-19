"use client"

import useParams from "@/utils/useParams"
import usePeer from "@/utils/usePeer"

import HelpText from "@/components/HelpText"
import InputField from "@/components/InputField"
import UrlCopyField from "@/components/InputField/UrlCopyField"

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

  const { connectRemote, disconnect, peerId } = peerData

  const closeButton = (
    <div className="flex justify-end">
      <button
        onClick={(event) => {
          closeSettings()
          event.preventDefault()
        }}
        className="block mb-8 rounded-lg px-8 py-4 text-center font-bold bg-primary hover:bg-primary/80 text-foreground cursor-pointer"
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
                  id="timer_url"
                  containerClassName="px-3"
                  value={getUrlWithParams()}
                />
                <p>
                  <button
                    className="underline cursor-pointer hover:text-primary font-bold"
                    onClick={async () => {
                      const id = await connectRemote(remoteId)
                      if (!remoteId) {
                        setParams({ rid: id })
                      }
                    }}
                    type="button"
                  >
                    Switch to remote mode
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
                    <p>
                      Open as many client windows on as many devices as you want
                      to view the timer.
                    </p>
                    <UrlCopyField
                      label="Client URL"
                      id="timer_url"
                      containerClassName="px-3"
                      value={getUrlWithParams(
                        undefined,
                        {
                          rid: peerId,
                        },
                        false,
                      )}
                      showOpenButton={true}
                    />
                  </div>
                ) : (
                  <p>Connecting to server...</p>
                )}
                <p>
                  <button
                    className="underline cursor-pointer hover:text-primary font-bold"
                    onClick={() => {
                      disconnect()
                      setParams({ rid: undefined })
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
