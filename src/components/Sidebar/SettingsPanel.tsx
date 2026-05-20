"use client"

import HelpText from "@/components/HelpText"
import ActionButton from "@/utils/ActionButton"
import ColorSwatchField from "@/utils/ColorSwatchField"
import { WindowIcon } from "@/utils/icons"
import type { FloatingTimerData } from "@/utils/useFloatingTimerPiP"

export default function SettingsPanel({
  floatingTimerData,
  handleChange,
  params,
}: {
  floatingTimerData: FloatingTimerData
  handleChange: (key: string, value: string) => void
  params: {
    bg: string
    fg: string
  }
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Appearance
          </h3>
          <p className="mt-1 text-sm/6 text-foreground/68">
            Adjust the timer colors that frame the clock.
          </p>
        </div>
        <div className="grid gap-3">
          <ColorSwatchField
            id="sidebar-background"
            label="Background"
            onChange={(event) => handleChange("bg", event.target.value)}
            value={params.bg}
          />
          <ColorSwatchField
            id="sidebar-foreground"
            label="Foreground"
            onChange={(event) => handleChange("fg", event.target.value)}
            value={params.fg}
          />
        </div>
      </section>
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Floating Timer
          </h3>
          <p className="mt-1 text-sm/6 text-foreground/68">
            Keep a compact timer visible above other windows.
          </p>
        </div>
        <div className="space-y-3">
          <ActionButton
            data-testid="floating-timer-toggle"
            disabled={!floatingTimerData.isSupported}
            onClick={() => {
              void floatingTimerData.toggle()
            }}
            fullWidth={true}
          >
            <span>
              {floatingTimerData.isOpen
                ? "Floating timer open"
                : "Open floating timer"}
            </span>
            <WindowIcon className="size-4" />
          </ActionButton>
          {!floatingTimerData.isSupported && (
            <p className="text-sm/6 text-foreground/68">
              {floatingTimerData.unsupportedReason ??
                "Floating Timer is not available in this browser."}
            </p>
          )}
        </div>
      </section>
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Keyboard Shortcuts
          </h3>
          <p className="mt-1 text-sm/6 text-foreground/68">
            Global timer shortcuts stay available when overlays are closed.
          </p>
        </div>
        <HelpText />
      </section>
    </div>
  )
}
