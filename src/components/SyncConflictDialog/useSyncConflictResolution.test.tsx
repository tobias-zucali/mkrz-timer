import { act, renderHook } from "@testing-library/react"
import type { RefObject } from "react"

import {
  DEFAULT_SYNC_PARAMS,
  DEFAULT_TIMER_STATE,
} from "@/shared/security/input"
import type { SessionSnapshot, SyncParams } from "@/shared/liveSession/types"
import {
  parseTimerUrlState,
  projectFirstUrlTimerRowToSyncParams,
} from "@/shared/urlState"
import useSyncConflictResolution from "@/app/liveSession/useSyncConflictResolution"
import type useParams from "@/utils/useParams"
import type { TimerState } from "@/utils/useTimer"

const buildParams = (overrides: Partial<SyncParams> = {}): SyncParams => ({
  ...DEFAULT_SYNC_PARAMS,
  rows: [
    {
      ...DEFAULT_SYNC_PARAMS.rows[0],
      primaryColor: "#00aa88",
      title: "Server state",
    },
  ],
  title: "Server state",
  pc: "#00aa88",
  ...overrides,
})

const buildState = (overrides: Partial<TimerState> = {}): TimerState => ({
  ...DEFAULT_TIMER_STATE,
  ...overrides,
})

describe("useSyncConflictResolution", () => {
  it("flags a conflict only when both the URL snapshot and relay snapshot changed", () => {
    const urlState = parseTimerUrlState({
      searchParams: new URLSearchParams(
        "v=1&t=45!ff8800!URL%20Override!0&bg=111111&fg=eeeeee",
      ),
    })
    const startingParams: SyncParams = buildParams()
    const syncParamsRef = {
      current: startingParams,
    } as RefObject<SyncParams>
    const syncStateRef = {
      current: {
        ...buildState(),
      },
    } as RefObject<TimerState>
    const applyLocalSnapshot = vi.fn()
    const paramData = {
      readTimerUrlState: () => urlState,
      setParams: vi.fn(),
    } as unknown as ReturnType<typeof useParams>

    const { result } = renderHook(() =>
      useSyncConflictResolution({
        applyLocalSnapshot,
        paramData,
        remoteRole: "control",
        syncParamsRef,
        syncStateRef,
      }),
    )

    expect(
      result.current.resolveIncomingSnapshot({
        snapshot: {
          params: buildParams({
            pc: "#ff2200",
            rows: [
              {
                ...DEFAULT_SYNC_PARAMS.rows[0],
                primaryColor: "#ff2200",
                title: "Relay override",
                totalSeconds: 90,
              },
            ],
            title: "Relay override",
          }),
          state: {
            ...DEFAULT_TIMER_STATE,
            currentRepeat: 1,
            durationSeconds: 90,
            elapsedSecondsAtAnchor: 0,
            elapsedTime: 0,
            isPaused: true,
            isStarted: false,
            lastUpdatedAt: 0,
            revision: 3,
            status: "idle",
            totalDuration: 90,
          },
        },
      }),
    ).toEqual({
      localSnapshot: {
        params: projectFirstUrlTimerRowToSyncParams({
          fallback: startingParams,
          state: urlState,
        }),
        state: {
          ...DEFAULT_TIMER_STATE,
          currentRepeat: 1,
          durationSeconds: 45,
          elapsedSecondsAtAnchor: 0,
          elapsedTime: 0,
          isPaused: true,
          isStarted: false,
          lastUpdatedAt: 0,
          revision: 0,
          status: "idle",
          totalDuration: 45,
        },
      },
      resolution: "conflict",
    })

    act(() => {
      result.current.notifyIncomingSyncConflict()
    })
    expect(result.current.hasSyncConflict).toBe(true)

    act(() => {
      result.current.applyUrlSyncState()
    })

    const projectedParams = projectFirstUrlTimerRowToSyncParams({
      fallback: startingParams,
      state: urlState,
    })

    expect(applyLocalSnapshot).toHaveBeenCalledWith({
      params: projectedParams,
      state: {
        ...DEFAULT_TIMER_STATE,
        currentRepeat: 1,
        durationSeconds: 45,
        elapsedSecondsAtAnchor: 0,
        elapsedTime: 0,
        isPaused: true,
        isStarted: false,
        lastUpdatedAt: 0,
        revision: 0,
        status: "idle",
        totalDuration: 45,
      },
    } satisfies SessionSnapshot)
    expect(syncParamsRef.current).toEqual(projectedParams)
    expect(syncStateRef.current).toEqual({
      ...DEFAULT_TIMER_STATE,
      currentRepeat: 1,
      durationSeconds: 45,
      elapsedSecondsAtAnchor: 0,
      elapsedTime: 0,
      isPaused: true,
      isStarted: false,
      lastUpdatedAt: 0,
      revision: 0,
      status: "idle",
      totalDuration: 45,
    })
    expect(result.current.hasSyncConflict).toBe(false)
  })

  it("builds a reconnect snapshot from the URL state when timer params are present", () => {
    const urlState = parseTimerUrlState({
      searchParams: new URLSearchParams(
        "v=1&t=150!ff8800!Opening!0&bg=111111&fg=eeeeee",
      ),
    })
    const syncParamsRef = {
      current: {
        ...buildParams(),
      },
    } as RefObject<SyncParams>
    const syncStateRef = {
      current: {
        ...buildState({
          elapsedTime: 5,
          revision: 2,
        }),
      },
    } as RefObject<TimerState>
    const applyLocalSnapshot = vi.fn()
    const paramData = {
      readTimerUrlState: () => urlState,
      setParams: vi.fn(),
    } as unknown as ReturnType<typeof useParams>

    const { result } = renderHook(() =>
      useSyncConflictResolution({
        applyLocalSnapshot,
        paramData,
        remoteRole: "control",
        syncParamsRef,
        syncStateRef,
      }),
    )

    const reconnectSnapshot = result.current.getReconnectSnapshot()

    expect(applyLocalSnapshot).toHaveBeenCalledWith(reconnectSnapshot)
    expect(reconnectSnapshot).toEqual({
      params: {
        activeIndex: 0,
        theme: "dark",
        m: "02",
        pc: "#ff8800",
        rows: [
          {
            endBehavior: "stop",
            primaryColor: "#ff8800",
            repeatCount: 1,
            title: "Opening",
            totalSeconds: 150,
          },
        ],
        s: "30",
        snd: DEFAULT_SYNC_PARAMS.snd,
        title: "Opening",
        tts: DEFAULT_SYNC_PARAMS.tts,
      },
      state: {
        ...DEFAULT_TIMER_STATE,
        currentRepeat: 1,
        durationSeconds: 150,
        elapsedSecondsAtAnchor: 5,
        elapsedTime: 5,
        isPaused: true,
        isStarted: false,
        lastUpdatedAt: 0,
        revision: 2,
        status: "idle",
        totalDuration: 150,
      },
    })
  })

  it("accepts local URL changes silently when the relay still matches the baseline", () => {
    const localOnlyUrlState = parseTimerUrlState({
      searchParams: new URLSearchParams(
        "v=1&t=45!ff8800!URL%20Override!0&bg=111111&fg=eeeeee",
      ),
    })
    const syncParamsRef = {
      current: {
        ...buildParams(),
      },
    } as RefObject<SyncParams>
    const syncStateRef = {
      current: {
        ...buildState({
          currentRepeat: 1,
          durationSeconds: 300,
          elapsedSecondsAtAnchor: 0,
          elapsedTime: 0,
          isPaused: true,
          isStarted: false,
          status: "idle",
          totalDuration: 300,
          revision: 4,
        }),
      },
    } as RefObject<TimerState>
    const paramData = {
      readTimerUrlState: () => localOnlyUrlState,
      setParams: vi.fn(),
    } as unknown as ReturnType<typeof useParams>

    const { result } = renderHook(() =>
      useSyncConflictResolution({
        applyLocalSnapshot: vi.fn(),
        paramData,
        remoteRole: "control",
        syncParamsRef,
        syncStateRef,
      }),
    )

    expect(
      result.current.resolveIncomingSnapshot({
        snapshot: {
          params: buildParams(),
          state: syncStateRef.current,
        },
      }),
    ).toMatchObject({
      resolution: "accept-local",
    })
  })

  it("accepts relay updates silently when the URL snapshot did not change", () => {
    const matchingUrlState = parseTimerUrlState({
      searchParams: new URLSearchParams(
        "v=1&t=300!00aa88!Server%20state!0&bg=000000&fg=ffffff",
      ),
    })
    const syncParamsRef = {
      current: {
        ...buildParams(),
      },
    } as RefObject<SyncParams>
    const syncStateRef = {
      current: {
        ...buildState({
          currentRepeat: 1,
          durationSeconds: 300,
          elapsedSecondsAtAnchor: 0,
          elapsedTime: 0,
          isPaused: true,
          isStarted: false,
          status: "idle",
          totalDuration: 300,
          revision: 4,
        }),
      },
    } as RefObject<TimerState>
    const paramData = {
      readTimerUrlState: () => matchingUrlState,
      setParams: vi.fn(),
    } as unknown as ReturnType<typeof useParams>

    const { result } = renderHook(() =>
      useSyncConflictResolution({
        applyLocalSnapshot: vi.fn(),
        paramData,
        remoteRole: "control",
        syncParamsRef,
        syncStateRef,
      }),
    )

    expect(
      result.current.resolveIncomingSnapshot({
        snapshot: {
          params: syncParamsRef.current,
          state: {
            ...DEFAULT_TIMER_STATE,
            currentRepeat: 1,
            durationSeconds: 300,
            elapsedSecondsAtAnchor: 0,
            elapsedTime: 0,
            isPaused: true,
            isStarted: false,
            lastUpdatedAt: 0,
            revision: 7,
            status: "idle",
            totalDuration: 300,
          },
        },
      }),
    ).toEqual({
      localSnapshot: {
        params: syncParamsRef.current,
        state: {
          ...syncStateRef.current,
          anchorServerTimestamp: 0,
          currentRepeat: 1,
          durationSeconds: 300,
          elapsedSecondsAtAnchor: 0,
          status: "idle",
          totalDuration: 300,
        },
      },
      resolution: "accept-server",
    })
  })

  it("preserves runtime-extended duration when rebuilding URL snapshots for recovery", () => {
    const matchingUrlState = parseTimerUrlState({
      searchParams: new URLSearchParams(
        "v=1&t=300!00aa88!Server%20state!0&bg=000000&fg=ffffff",
      ),
    })
    const syncParamsRef = {
      current: {
        ...buildParams({
          m: "05",
          s: "00",
          rows: [
            {
              ...DEFAULT_SYNC_PARAMS.rows[0],
              primaryColor: "#00aa88",
              title: "Server state",
              totalSeconds: 300,
            },
          ],
        }),
      },
    } as RefObject<SyncParams>
    const syncStateRef = {
      current: {
        ...buildState({
          currentRepeat: 1,
          durationSeconds: 300,
          elapsedSecondsAtAnchor: 12,
          elapsedTime: 12,
          isPaused: false,
          isStarted: true,
          status: "running",
          totalDuration: 360,
          revision: 4,
        }),
      },
    } as RefObject<TimerState>
    const paramData = {
      readTimerUrlState: () => matchingUrlState,
      setParams: vi.fn(),
    } as unknown as ReturnType<typeof useParams>

    const { result } = renderHook(() =>
      useSyncConflictResolution({
        applyLocalSnapshot: vi.fn(),
        paramData,
        remoteRole: "control",
        syncParamsRef,
        syncStateRef,
      }),
    )

    const reconnectSnapshot = result.current.getReconnectSnapshot()

    expect(reconnectSnapshot.state).toMatchObject({
      durationSeconds: 300,
      elapsedSecondsAtAnchor: 12,
      status: "running",
      totalDuration: 360,
    })
  })
})
