import { act, renderHook } from "@testing-library/react"
import type { RefObject } from "react"

import {
  DEFAULT_SYNC_PARAMS,
  DEFAULT_TIMER_STATE,
} from "@/shared/security/input"
import type { SessionSnapshot, SyncParams } from "@/shared/remoteSession/types"
import {
  parseTimerUrlState,
  projectFirstUrlTimerRowToSyncParams,
} from "@/shared/urlState"
import useSyncConflictResolution from "@/app/useSyncConflictResolution"
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
  it("defers conflicting control snapshots and can apply the URL snapshot locally", () => {
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
      result.current.shouldDeferIncomingSnapshot({
        snapshot: {
          params: startingParams,
          state: syncStateRef.current,
        },
      }),
    ).toBe(true)

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
        currentRepeat: 1,
        elapsedTime: 0,
        isPaused: true,
        isStarted: false,
        lastUpdatedAt: 0,
        revision: 0,
        totalDuration: 45,
      },
    } satisfies SessionSnapshot)
    expect(syncParamsRef.current).toEqual(projectedParams)
    expect(syncStateRef.current).toEqual({
      currentRepeat: 1,
      elapsedTime: 0,
      isPaused: true,
      isStarted: false,
      lastUpdatedAt: 0,
      revision: 0,
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
        bg: "#111111",
        fg: "#eeeeee",
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
        title: "Opening",
      },
      state: {
        currentRepeat: 1,
        elapsedTime: 5,
        isPaused: true,
        isStarted: false,
        lastUpdatedAt: 0,
        revision: 2,
        totalDuration: 150,
      },
    })
  })

  it("ignores elapsed-time differences within one second when params match", () => {
    const matchingUrlState = parseTimerUrlState({
      searchParams: new URLSearchParams(
        "v=1&t=60!00aa88!Server%20state!0&bg=000000&fg=ffffff",
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
          elapsedTime: 12,
          isPaused: false,
          isStarted: true,
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
      result.current.shouldDeferIncomingSnapshot({
        snapshot: {
          params: syncParamsRef.current,
          state: {
            currentRepeat: 1,
            elapsedTime: 13,
            isPaused: false,
            isStarted: true,
            lastUpdatedAt: 0,
            revision: 7,
            totalDuration: 60,
          },
        },
      }),
    ).toBe(false)
  })

  it("treats elapsed-time differences above one second as a reconnect conflict", () => {
    const matchingUrlState = parseTimerUrlState({
      searchParams: new URLSearchParams(
        "v=1&t=60!00aa88!Server%20state!0&bg=000000&fg=ffffff",
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
          elapsedTime: 12,
          isPaused: false,
          isStarted: true,
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
      result.current.shouldDeferIncomingSnapshot({
        snapshot: {
          params: syncParamsRef.current,
          state: {
            currentRepeat: 1,
            elapsedTime: 14,
            isPaused: false,
            isStarted: true,
            lastUpdatedAt: 0,
            revision: 7,
            totalDuration: 60,
          },
        },
      }),
    ).toBe(true)
  })
})
