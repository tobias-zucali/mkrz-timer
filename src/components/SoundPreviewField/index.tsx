"use client"

import { useEffect, useId, useRef } from "react"

import PanelLabel from "@/components/PanelLabel"
import SelectField from "@/components/SelectField"
import ActionButton from "@/utils/ActionButton"
import { PlayIcon } from "@/utils/icons"
import {
  getTimerFinishedSoundOption,
  TIMER_FINISHED_SOUND_OPTIONS,
  type TimerFinishedSoundId,
} from "@/shared/timerSettings"

type SoundPreviewFieldProps = {
  label: string
  onChange: (value: TimerFinishedSoundId) => void
  previewLabel: string
  value: TimerFinishedSoundId
}

export default function SoundPreviewField({
  label,
  onChange,
  previewLabel,
  value,
}: SoundPreviewFieldProps) {
  const fieldId = useId()
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const selectedSound = getTimerFinishedSoundOption(value)
  const canPreviewSound = selectedSound.src !== null

  useEffect(() => {
    return () => {
      previewAudioRef.current?.pause()
      previewAudioRef.current = null
    }
  }, [])

  return (
    <div>
      <PanelLabel htmlFor={fieldId}>{label}</PanelLabel>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <SelectField
            id={fieldId}
            onChange={(event) =>
              onChange(event.target.value as TimerFinishedSoundId)
            }
            value={value}
          >
            {TIMER_FINISHED_SOUND_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </div>
        <ActionButton
          aria-label={previewLabel}
          className="h-11 shrink-0 px-3"
          tone="secondary"
          disabled={!canPreviewSound}
          onClick={() => {
            if (!selectedSound.src) {
              return
            }

            previewAudioRef.current?.pause()
            previewAudioRef.current = new Audio(selectedSound.src)
            previewAudioRef.current.currentTime = 0
            void previewAudioRef.current.play()
          }}
          type="button"
        >
          <PlayIcon className="size-4" />
        </ActionButton>
      </div>
    </div>
  )
}
