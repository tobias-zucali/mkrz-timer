"use client"

import type { FloatingTimerData } from "@/utils/useFloatingTimerPiP"
import useParams from "@/utils/useParams"
import usePeer from "@/utils/usePeer"

import CloseButton from "@/components/CloseButton"
import HelpText from "@/components/HelpText"
import InputField from "@/components/InputField"
import UrlCopyField from "@/components/UrlCopyField"
import classNames from "classnames"
import { useId } from "react"

const panelClassName =
  "rounded-2xl border border-foreground/12 bg-foreground/4 shadow-xl shadow-background/30"
const sectionClassName = `${panelClassName} p-6 sm:p-7`
const actionButtonClassName =
  "inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
const primaryActionButtonClassName = `${actionButtonClassName} bg-primary text-background hover:bg-primary/85`

function DrawerSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className={sectionClassName}>
      <div
        className={classNames(
          "pb-4",
          description && "mb-5 border-b border-foreground/10",
        )}
      >
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-foreground/68">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  disabled = false,
  onChange,
  testId,
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange: () => void
  testId?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium text-foreground">{label}</p>
        <p className="mt-1 text-sm leading-6 text-foreground/68">
          {description}
        </p>
      </div>
      <button
        aria-checked={checked}
        aria-label={label}
        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border transition ${
          checked
            ? "border-primary/70 bg-primary"
            : "border-foreground/15 bg-foreground/10"
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        data-testid={testId}
        disabled={disabled}
        onClick={onChange}
        role="switch"
        type="button"
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition ${
            checked ? "left-[1.45rem]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  )
}

function ColorSwatchField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: React.ChangeEventHandler<HTMLInputElement>
}) {
  return (
    <label
      className="flex items-center gap-4 rounded-xl border border-foreground/12 bg-foreground/[0.07] px-4 py-3 shadow-sm shadow-background/15"
      htmlFor={id}
    >
      <input
        className="h-11 w-14 cursor-pointer rounded-lg border border-foreground/15 bg-transparent"
        id={id}
        name={id}
        onChange={onChange}
        onKeyDown={(event) => event.stopPropagation()}
        onKeyUp={(event) => event.stopPropagation()}
        type="color"
        value={value}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="mt-0.5 block font-mono text-xs uppercase tracking-[0.08em] text-foreground/55">
          {value}
        </span>
      </span>
    </label>
  )
}

export default function Settings({
  floatingTimerData,
  isOpen,
  peerData,
  paramData,
  closeSettings,
  handleChange,
}: {
  floatingTimerData: FloatingTimerData
  isOpen: boolean
  peerData: ReturnType<typeof usePeer>
  paramData: ReturnType<typeof useParams>
  closeSettings: () => void
  handleChange: (key: string, value: string) => void
}) {
  const settingsId = useId()
  const { params, setParams, getUrlWithParams } = paramData
  const { rid: remoteId } = params

  const { connectRemote, disconnect, isConnecting, peerId } = peerData
  const timerUrl = getUrlWithParams()
  const readonlyClientUrl = getUrlWithParams({
    inherit: false,
    params: {
      rid: peerId,
    },
  })
  const controlClientUrl = getUrlWithParams({
    inherit: false,
    params: {
      rid: peerId,
      control: "42",
    },
  })
  const isRemoteReady = Boolean(peerData.peerId)
  const remoteErrorText =
    !remoteId && peerData.error ? peerData.error.message : null

  return (
    <div
      aria-labelledby={settingsId}
      aria-modal={isOpen ? "true" : "false"}
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-40 transition-[visibility] duration-300 motion-reduce:transition-none ${
        isOpen ? "visible" : "invisible pointer-events-none"
      }`}
      role="dialog"
    >
      <button
        aria-label="Close settings"
        className={`absolute inset-0 bg-foreground/10 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeSettings}
        type="button"
      />
      <aside
        className={`absolute inset-y-0 left-0 flex w-full max-w-4xl flex-col border-r border-foreground/12 bg-background shadow-2xl shadow-background/45 ring-1 ring-foreground/6 transition duration-300 ease-out motion-reduce:transition-none ${
          isOpen
            ? "translate-x-0 opacity-100"
            : "-translate-x-full opacity-0 pointer-events-none"
        }`}
        data-testid="settings-drawer"
        onKeyDownCapture={(event) => {
          if (isOpen) {
            event.stopPropagation()
          }
        }}
        onKeyUpCapture={(event) => {
          if (!isOpen) {
            return
          }
          if (event.key === "Escape") {
            closeSettings()
          }
          event.stopPropagation()
        }}
      >
        <header className="sticky top-0 z-10 border-b border-foreground/12 bg-background/88 px-5 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                Timer Settings
              </p>
              <h1
                className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl"
                id={settingsId}
              >
                Adjust the timer without leaving the clock.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-foreground/68">
                Changes apply live to connected control clients.
              </p>
            </div>
            <CloseButton onClick={closeSettings} />
          </div>
        </header>

        <div className="overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
          <div className="max-w-4xl">
            <form className="space-y-8">
              <fieldset className="space-y-8" disabled={!isOpen}>
                <DrawerSection title="Timer">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputField
                      containerClassName="sm:col-span-2"
                      id="title"
                      label="Title"
                      value={params.title}
                      onChange={(event) =>
                        handleChange("title", event.target.value)
                      }
                    />
                    <InputField
                      id="minutes"
                      inputMode="numeric"
                      label="Minutes"
                      type="number"
                      value={params.m || 1}
                      onChange={(event) =>
                        handleChange("m", event.target.value)
                      }
                    />
                    <InputField
                      id="seconds"
                      inputMode="numeric"
                      label="Seconds"
                      type="number"
                      value={params.s || 0}
                      onChange={(event) =>
                        handleChange("s", event.target.value)
                      }
                    />
                  </div>
                </DrawerSection>

                <DrawerSection title="Appearance">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ColorSwatchField
                      id="bg"
                      label="Background"
                      value={params.bg}
                      onChange={(event) =>
                        handleChange("bg", event.target.value)
                      }
                    />
                    <ColorSwatchField
                      id="fg"
                      label="Foreground"
                      value={params.fg}
                      onChange={(event) =>
                        handleChange("fg", event.target.value)
                      }
                    />
                    <ColorSwatchField
                      id="pc"
                      label="Primary"
                      value={params.pc}
                      onChange={(event) =>
                        handleChange("pc", event.target.value)
                      }
                    />
                  </div>
                </DrawerSection>

                <DrawerSection title="Sharing">
                  <div className="space-y-5">
                    <ToggleRow
                      checked={Boolean(remoteId || isConnecting)}
                      description="Use remote mode when another screen should view or control the timer."
                      disabled={isConnecting || Boolean(remoteErrorText)}
                      label="Remote mode"
                      onChange={async () => {
                        if (remoteId) {
                          disconnect()
                          setParams({ control: null, rid: undefined })
                          return
                        }

                        const id = await connectRemote()
                        if (!remoteId && id) {
                          setParams({ control: "42", rid: id })
                        }
                      }}
                    />

                    {!remoteId && (
                      <div className="border-t border-foreground/10 pt-5">
                        <div className="space-y-4">
                          <UrlCopyField
                            label="Share Link"
                            description="Use this link to reopen the current timer setup."
                            value={timerUrl}
                          />
                        </div>
                      </div>
                    )}

                    {remoteId && isRemoteReady ? (
                      <div className="border-t border-foreground/10 pt-5">
                        <div className="space-y-5">
                          <div className="space-y-3">
                            <UrlCopyField
                              label="Viewer Link"
                              showOpenButton={true}
                              value={readonlyClientUrl}
                              description="Share this with viewers to watch the timer."
                            />
                          </div>
                          <div className="space-y-3">
                            <UrlCopyField
                              label="Control Link"
                              showOpenButton={true}
                              value={controlClientUrl}
                              description="Share this with someone who should control the timer and settings."
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </DrawerSection>

                <DrawerSection title="Floating Timer">
                  <ToggleRow
                    checked={floatingTimerData.isOpen}
                    description={
                      floatingTimerData.isSupported
                        ? "Keep a small timer visible above other windows."
                        : (floatingTimerData.unsupportedReason ??
                          "Floating Timer is not available in this browser.")
                    }
                    disabled={!floatingTimerData.isSupported}
                    label="Always-on-top window"
                    onChange={() => {
                      void floatingTimerData.toggle()
                    }}
                    testId="floating-timer-toggle"
                  />
                </DrawerSection>

                <DrawerSection
                  title="Keyboard Shortcuts"
                  description="Global timer shortcuts stay available when the drawer is closed."
                >
                  <HelpText />
                </DrawerSection>

                <div className="flex items-center justify-end">
                  <button
                    className={primaryActionButtonClassName}
                    onClick={closeSettings}
                    type="button"
                  >
                    Done
                  </button>
                </div>
              </fieldset>
            </form>
          </div>
        </div>
      </aside>
    </div>
  )
}
