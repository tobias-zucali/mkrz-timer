import { act, renderHook } from "@testing-library/react"

import { DEFAULT_SYNC_PARAMS } from "@/shared/security/input"

import useTimer from "."

class MockAudio {
  currentTime = 0
  pause = vi.fn()
  play = vi.fn().mockResolvedValue(undefined)

  constructor(public readonly src: string | null) {}
}

describe("useTimer finish sound", () => {
  let audioInstances: MockAudio[] = []
  const onAction = vi.fn()
  const buildSyncStateRef = () => ({
    current: {
      anchorServerTimestamp: 0,
      currentRepeat: 1,
      durationSeconds: 30,
      elapsedSecondsAtAnchor: 0,
      elapsedTime: 0,
      isPaused: true,
      isStarted: false,
      lastUpdatedAt: 0,
      revision: 0,
      status: "idle" as const,
      totalDuration: 30,
    },
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-06-01T08:00:00Z"))
    onAction.mockReset()
    audioInstances = []
    const AudioConstructor = vi.fn(function (this: unknown, src?: string) {
      const audio = new MockAudio(src ?? null)
      audioInstances.push(audio)
      return audio
    })
    vi.stubGlobal("Audio", AudioConstructor as unknown as typeof Audio)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("plays the selected finish sound exactly once when the timer times out", () => {
    const { result } = renderHook(() =>
      useTimer({
        onAction,
        params: {
          ...DEFAULT_SYNC_PARAMS,
          m: "00",
          s: "30",
          snd: "b",
        },
        syncStateRef: buildSyncStateRef(),
      }),
    )

    act(() => {
      result.current.setState({
        anchorServerTimestamp: Date.now() - 30_000,
        currentRepeat: 1,
        durationSeconds: 30,
        elapsedSecondsAtAnchor: 30,
        elapsedTime: 30,
        isPaused: false,
        isStarted: true,
        lastUpdatedAt: Date.now() - 30_000,
        revision: 1,
        status: "running",
        totalDuration: 30,
      })
    })

    const audioInstance = audioInstances[0]
    expect(audioInstance).toBeDefined()
    expect(audioInstance.src).toBe("/sounds/Ringing_Bell.mp3")
    expect(audioInstance.play).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.setState({
        anchorServerTimestamp: 0,
        currentRepeat: 1,
        durationSeconds: 30,
        elapsedSecondsAtAnchor: 30,
        elapsedTime: 30,
        isPaused: true,
        isStarted: true,
        lastUpdatedAt: Date.now(),
        revision: 2,
        status: "finished",
        totalDuration: 30,
      })
    })

    expect(audioInstance.play).toHaveBeenCalledTimes(1)
  })

  it("does not play a finish sound when the selection is no sound", () => {
    const { result } = renderHook(() =>
      useTimer({
        onAction,
        params: {
          ...DEFAULT_SYNC_PARAMS,
          m: "00",
          s: "30",
          snd: "o",
        },
        syncStateRef: buildSyncStateRef(),
      }),
    )

    act(() => {
      result.current.setState({
        anchorServerTimestamp: Date.now() - 30_000,
        currentRepeat: 1,
        durationSeconds: 30,
        elapsedSecondsAtAnchor: 30,
        elapsedTime: 30,
        isPaused: false,
        isStarted: true,
        lastUpdatedAt: Date.now() - 30_000,
        revision: 1,
        status: "running",
        totalDuration: 30,
      })
    })

    expect(Audio).not.toHaveBeenCalled()
  })
})
