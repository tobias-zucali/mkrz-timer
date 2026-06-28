export const TIMER_FINISHED_SOUND_OPTIONS = [
  {
    id: "a",
    label: "Attention",
    src: "/sounds/Attention.mp3",
  },
  {
    id: "b",
    label: "Ringing Bell",
    src: "/sounds/Ringing_Bell.mp3",
  },
  {
    id: "c",
    label: "Old Ring Ringing",
    src: "/sounds/Old_Ring_Ringing.mp3",
  },
  {
    id: "o",
    label: "No sound",
    src: null,
  },
] as const

export type TimerFinishedSoundId =
  (typeof TIMER_FINISHED_SOUND_OPTIONS)[number]["id"]

export const DEFAULT_TIMER_FINISHED_SOUND_ID =
  "a" satisfies TimerFinishedSoundId
export const TIMER_TTS_ENABLED_QUERY_VALUE = "1"

export type TtsMode = "0" | "1" | "2"
export const TTS_MODE_OFF: TtsMode = "0"
export const TTS_MODE_ALERTS: TtsMode = "1"
export const TTS_MODE_COUNTDOWNS: TtsMode = "2"
export const DEFAULT_TTS_MODE: TtsMode = TTS_MODE_OFF

export const isTtsMode = (value: unknown): value is TtsMode =>
  value === TTS_MODE_OFF || value === TTS_MODE_ALERTS || value === TTS_MODE_COUNTDOWNS

export const isTimerFinishedSoundId = (
  value: unknown,
): value is TimerFinishedSoundId =>
  typeof value === "string" &&
  TIMER_FINISHED_SOUND_OPTIONS.some((option) => option.id === value)

export const normalizeTimerFinishedSoundId = (
  value: unknown,
  fallback: TimerFinishedSoundId = DEFAULT_TIMER_FINISHED_SOUND_ID,
): TimerFinishedSoundId => (isTimerFinishedSoundId(value) ? value : fallback)

export const getTimerFinishedSoundOption = (id: TimerFinishedSoundId) =>
  TIMER_FINISHED_SOUND_OPTIONS.find((option) => option.id === id) ??
  TIMER_FINISHED_SOUND_OPTIONS[0]

export const normalizeTimerTtsMode = (
  value: unknown,
  fallback: TtsMode = DEFAULT_TTS_MODE,
): TtsMode => {
  if (value === TTS_MODE_COUNTDOWNS) return TTS_MODE_COUNTDOWNS
  if (
    value === true ||
    value === TIMER_TTS_ENABLED_QUERY_VALUE ||
    value === "true"
  ) {
    return TTS_MODE_ALERTS
  }
  if (value === false || value === TTS_MODE_OFF || value === "false") {
    return TTS_MODE_OFF
  }
  return fallback
}
