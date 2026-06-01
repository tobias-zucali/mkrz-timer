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

  it("auto-advances local running timers through sequence steps", async () => {
    const syncStateRef = buildSyncStateRef()
    const { result } = renderHook(() =>
      useTimer({
        onAction,
        params: {
          ...DEFAULT_SYNC_PARAMS,
          activeIndex: 0,
          rows: [
            {
              ...DEFAULT_SYNC_PARAMS.rows[0],
              endBehavior: "advance",
              title: "Intro",
              totalSeconds: 30,
            },
            {
              ...DEFAULT_SYNC_PARAMS.rows[0],
              title: "Discussion",
              totalSeconds: 45,
            },
          ],
        },
        syncStateRef,
      }),
    )

    act(() => {
      result.current.setState({
        anchorServerTimestamp: Date.now() - 30_000,
        currentRepeat: 1,
        durationSeconds: 30,
        elapsedSecondsAtAnchor: 0,
        elapsedTime: 0,
        isPaused: false,
        isStarted: true,
        lastUpdatedAt: Date.now() - 30_000,
        revision: 1,
        status: "running",
        totalDuration: 30,
      })
    })

    await act(async () => {
      vi.advanceTimersByTime(20)
    })

    expect(onAction).toHaveBeenCalledWith(
      "start",
      expect.objectContaining({
        params: { activeIndex: 1 },
        state: expect.objectContaining({
          currentRepeat: 1,
          isPaused: false,
          isStarted: true,
          status: "running",
          totalDuration: 45,
        }),
      }),
    )

    expect(result.current.isStarted).toBe(true)
    expect(result.current.isPaused).toBe(false)
    expect(result.current.totalDuration).toBe(45)
  })

  it("plays the configured finish sound when a step auto-advances", async () => {
    const syncStateRef = buildSyncStateRef()
    const { result } = renderHook(() =>
      useTimer({
        onAction,
        params: {
          ...DEFAULT_SYNC_PARAMS,
          activeIndex: 0,
          snd: "b",
          rows: [
            {
              ...DEFAULT_SYNC_PARAMS.rows[0],
              endBehavior: "advance",
              title: "Intro",
              totalSeconds: 30,
            },
            {
              ...DEFAULT_SYNC_PARAMS.rows[0],
              title: "Discussion",
              totalSeconds: 45,
            },
          ],
        },
        syncStateRef,
      }),
    )

    act(() => {
      result.current.setState({
        anchorServerTimestamp: Date.now(),
        currentRepeat: 1,
        durationSeconds: 30,
        elapsedSecondsAtAnchor: 30,
        elapsedTime: 30,
        isPaused: false,
        isStarted: true,
        lastUpdatedAt: Date.now(),
        revision: 1,
        status: "running",
        totalDuration: 30,
      })
    })

    expect(audioInstances).toHaveLength(1)
    expect(audioInstances[0]?.src).toBe("/sounds/Ringing_Bell.mp3")
    expect(audioInstances[0]?.play).toHaveBeenCalledTimes(1)
  })

  it("resets activated steps to idle state", () => {
    const syncStateRef = buildSyncStateRef()
    const { result } = renderHook(() =>
      useTimer({
        onAction,
        params: {
          ...DEFAULT_SYNC_PARAMS,
          activeIndex: 0,
          rows: [
            {
              ...DEFAULT_SYNC_PARAMS.rows[0],
              title: "Intro",
              totalSeconds: 30,
            },
            {
              ...DEFAULT_SYNC_PARAMS.rows[0],
              title: "Discussion",
              totalSeconds: 45,
            },
          ],
        },
        syncStateRef,
      }),
    )

    act(() => {
      result.current.setState({
        anchorServerTimestamp: 0,
        currentRepeat: 1,
        durationSeconds: 30,
        elapsedSecondsAtAnchor: 12,
        elapsedTime: 12,
        isPaused: true,
        isStarted: true,
        lastUpdatedAt: Date.now(),
        revision: 1,
        status: "paused",
        totalDuration: 30,
      })
    })

    act(() => {
      result.current.activateRow(1)
    })

    expect(onAction).toHaveBeenLastCalledWith(
      "activate",
      expect.objectContaining({
        params: { activeIndex: 1 },
        state: expect.objectContaining({
          elapsedTime: 0,
          isPaused: true,
          isStarted: false,
          status: "idle",
          totalDuration: 45,
        }),
      }),
    )
  })
})
