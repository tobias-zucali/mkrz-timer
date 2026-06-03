"use client"

import { useId } from "react"
import { useTranslations } from "next-intl"

import HelpText from "@/components/HelpText"
import LocaleSwitcher from "@/components/Sidebar/SettingsPanel/LocaleSwitcher"
import SoundPreviewField from "@/components/SoundPreviewField"
import { type TimerFinishedSoundId } from "@/shared/timerSettings"
import ActionButton from "@/utils/ActionButton"
import ColorSwatchField from "@/utils/ColorSwatchField"
import { WindowIcon } from "@/utils/icons"
import type { FloatingTimerData } from "@/utils/useFloatingTimerPiP"

export type SettingsPanelProps = {
  floatingTimerData: FloatingTimerData
  handleChange: (key: string, value: string) => void
  params: {
    bg: string
    fg: string
    snd: TimerFinishedSoundId
    tts: boolean
  }
}

export default function SettingsPanel({
  floatingTimerData,
  handleChange,
  params,
}: SettingsPanelProps) {
  const t = useTranslations("Sidebar.settings")
  const backgroundId = useId()
  const foregroundId = useId()
  const ttsId = useId()

  return (
    <div className="space-y-6">
      <LocaleSwitcher />
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t("appearanceHeading")}
          </h3>
          <p className="mt-1 text-sm/6 text-foreground/68">
            {t("appearanceDescription")}
          </p>
        </div>
        <div className="grid gap-3">
          <ColorSwatchField
            id={backgroundId}
            label={t("background")}
            onChange={(event) => handleChange("bg", event.target.value)}
            value={params.bg}
          />
          <ColorSwatchField
            id={foregroundId}
            label={t("foreground")}
            onChange={(event) => handleChange("fg", event.target.value)}
            value={params.fg}
          />
        </div>
      </section>
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t("announcementsHeading")}
          </h3>
          <p className="mt-1 text-sm/6 text-foreground/68">
            {t("announcementsDescription")}
          </p>
        </div>
        <div
          className="space-y-4 rounded-2xl border
              border-foreground/10 bg-foreground/2 p-4"
        >
          <SoundPreviewField
            label={t("finishedSound")}
            onChange={(value) => handleChange("snd", value)}
            previewLabel={t("previewSound")}
            value={params.snd}
          />
          <label
            className="
              flex cursor-pointer items-start gap-3
            "
            htmlFor={ttsId}
          >
            <input
              checked={params.tts}
              className="mt-1 size-4 accent-primary"
              id={ttsId}
              onChange={(event) =>
                handleChange("tts", event.target.checked ? "1" : "0")
              }
              type="checkbox"
            />
            <span className="block text-sm font-medium text-foreground">
              {t("speakAnnouncements")}
            </span>
          </label>
        </div>
      </section>
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t("floatingHeading")}
          </h3>
          <p className="mt-1 text-sm/6 text-foreground/68">
            {t("floatingDescription")}
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
                ? t("floatingOpenState")
                : t("floatingOpen")}
            </span>
            <WindowIcon className="size-4" />
          </ActionButton>
          {!floatingTimerData.isSupported && (
            <p className="text-sm/6 text-foreground/68">
              {floatingTimerData.unsupportedReason ?? t("floatingUnsupported")}
            </p>
          )}
        </div>
      </section>
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t("shortcutsHeading")}
          </h3>
          <p className="mt-1 text-sm/6 text-foreground/68">
            {t("shortcutsDescription")}
          </p>
        </div>
        <HelpText />
      </section>
    </div>
  )
}
