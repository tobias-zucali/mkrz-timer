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

export const normalizeTimerTtsEnabled = (value: unknown, fallback = false) => {
  if (
    value === true ||
    value === TIMER_TTS_ENABLED_QUERY_VALUE ||
    value === "true"
  ) {
    return true
  }

  if (value === false || value === "0" || value === "false") {
    return false
  }

  return fallback
}
