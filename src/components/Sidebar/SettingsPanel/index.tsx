"use client"

import { useId } from "react"
import { useTranslations } from "next-intl"

import CheckboxField from "@/components/CheckboxField"
import HelpText from "@/components/HelpText"
import SegmentedControl from "@/components/SegmentedControl"
import LocaleSwitcher from "@/components/Sidebar/SettingsPanel/LocaleSwitcher"
import SoundPreviewField from "@/components/SoundPreviewField"
import type { AppTheme } from "@/shared/liveSession/types"
import { type TimerFinishedSoundId } from "@/shared/timerSettings"
import ActionButton from "@/utils/ActionButton"
import { WindowIcon } from "@/utils/icons"
import type { FloatingTimerData } from "@/utils/useFloatingTimerPiP"

export type SettingsPanelProps = {
  floatingTimerData: FloatingTimerData
  handleChange: (key: string, value: string) => void
  params: {
    theme: AppTheme
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
  const ttsId = useId()

  return (
    <div className="space-y-6">
      <LocaleSwitcher />
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-ink">
            {t("appearanceHeading")}
          </h3>
          <p className="mt-1 text-sm/6 text-ink/68">
            {t("appearanceDescription")}
          </p>
        </div>
        <SegmentedControl
          label={t("appearanceHeading")}
          onChange={(theme) => handleChange("theme", theme)}
          options={[
            { label: t("themeDark"), value: "dark" },
            { label: t("themeBright"), value: "bright" },
          ]}
          value={params.theme}
        />
      </section>
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-ink">
            {t("announcementsHeading")}
          </h3>
          <p className="mt-1 text-sm/6 text-ink/68">
            {t("announcementsDescription")}
          </p>
        </div>
        <div
          className="space-y-4 rounded-2xl border
              border-ink/10 bg-ink/2 p-4"
        >
          <SoundPreviewField
            label={t("finishedSound")}
            onChange={(value) => handleChange("snd", value)}
            previewLabel={t("previewSound")}
            value={params.snd}
          />
          <CheckboxField
            checked={params.tts}
            id={ttsId}
            label={t("speakAnnouncements")}
            onChange={(event) =>
              handleChange("tts", event.target.checked ? "1" : "0")
            }
          />
        </div>
      </section>
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-ink">
            {t("floatingHeading")}
          </h3>
          <p className="mt-1 text-sm/6 text-ink/68">
            {t("floatingDescription")}
          </p>
        </div>
        <div className="space-y-3">
          <ActionButton
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
            <p className="text-sm/6 text-ink/68">
              {floatingTimerData.unsupportedReason ?? t("floatingUnsupported")}
            </p>
          )}
        </div>
      </section>
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-ink">
            {t("shortcutsHeading")}
          </h3>
          <p className="mt-1 text-sm/6 text-ink/68">
            {t("shortcutsDescription")}
          </p>
        </div>
        <HelpText />
      </section>
    </div>
  )
}
