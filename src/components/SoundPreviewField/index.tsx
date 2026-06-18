"use client"

import { useEffect, useId, useRef } from "react"

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
    <div className="space-y-2">
      <label className="block text-sm font-medium text-ink" htmlFor={fieldId}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <select
          className="
            block h-10 min-w-0 flex-1 rounded-md border border-ink/10
            bg-screen px-3 text-sm text-ink outline-1
            -outline-offset-1 outline-ink/10 focus:outline-2
            focus:-outline-offset-2 focus:outline-primary
          "
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
        </select>
        <ActionButton
          aria-label={previewLabel}
          className="h-10 shrink-0 px-3"
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
