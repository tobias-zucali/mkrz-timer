"use client"

import { useId } from "react"
import { useTranslations } from "next-intl"

import HelpText from "@/components/HelpText"
import PanelLabel from "@/components/PanelLabel"
import SelectField from "@/components/SelectField"
import SoundPreviewField from "@/components/SoundPreviewField"
import LocaleSwitcher from "@/components/Sidebar/SettingsPanel/LocaleSwitcher"
import SegmentedControl from "@/components/SegmentedControl"
import type { AppTheme } from "@/shared/liveSession/types"
import {
  type TimerFinishedSoundId,
  TTS_MODE_ALERTS,
  TTS_MODE_COUNTDOWNS,
  TTS_MODE_OFF,
  type TtsMode,
} from "@/shared/timerSettings"
import ActionButton from "@/utils/ActionButton"
import { WindowIcon } from "@/utils/icons"
import type { FloatingTimerData } from "@/utils/useFloatingTimerPiP"

export type SettingsPanelProps = {
  floatingTimerData: FloatingTimerData
  handleChange: (key: string, value: string) => void
  params: {
    theme: AppTheme
    snd: TimerFinishedSoundId
    tts: TtsMode
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
    <div className="space-y-5">
      <LocaleSwitcher />
      <SegmentedControl
        label={t("themeLabel")}
        onChange={(theme) => handleChange("theme", theme)}
        options={[
          { label: t("themeDark"), value: "dark" },
          { label: t("themeBright"), value: "bright" },
        ]}
        value={params.theme}
      />
      <SoundPreviewField
        label={t("finishedSound")}
        onChange={(value) => handleChange("snd", value)}
        previewLabel={t("previewSound")}
        value={params.snd}
      />
      <SelectField
        id={ttsId}
        label={t("announcementsLabel")}
        onChange={(event) => handleChange("tts", event.target.value)}
        value={params.tts}
      >
        <option value={TTS_MODE_OFF}>{t("announcementsOff")}</option>
        <option value={TTS_MODE_ALERTS}>{t("announcementsAlerts")}</option>
        <option value={TTS_MODE_COUNTDOWNS}>{t("announcementsCountdowns")}</option>
      </SelectField>
      <div>
        <PanelLabel>{t("floatingLabel")}</PanelLabel>
        <div className="space-y-3">
          <ActionButton
            disabled={!floatingTimerData.isSupported}
            onClick={() => {
              void floatingTimerData.toggle()
            }}
            fullWidth={true}
            tone="secondary"
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
      </div>
      <div>
        <PanelLabel>{t("shortcutsHeading")}</PanelLabel>
        <HelpText />
      </div>
    </div>
  )
}
