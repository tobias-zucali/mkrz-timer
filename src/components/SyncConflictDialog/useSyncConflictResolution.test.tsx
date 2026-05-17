import { act, renderHook } from "@testing-library/react"
import type { RefObject } from "react"

import type { SyncParams } from "@/shared/remoteSession/types"
import {
  parseTimerUrlState,
  projectFirstUrlTimerRowToSyncParams,
} from "@/shared/urlState"
import useSyncConflictResolution from "@/app/useSyncConflictResolution"
import type useParams from "@/utils/useParams"
import type { TimerState } from "@/utils/useTimer"

describe("useSyncConflictResolution", () => {
  it("defers conflicting control snapshots and can apply the URL snapshot locally", () => {
    const urlState = parseTimerUrlState({
      searchParams: new URLSearchParams(
        "v=1&t=45!ff8800!URL%20Override!0&bg=111111&fg=eeeeee",
      ),
    })
    const startingParams: SyncParams = {
      bg: "#000000",
      fg: "#ffffff",
      m: "01",
      pc: "#00aa88",
      s: "00",
      title: "Server state",
    }
    const syncParamsRef = {
      current: startingParams,
    } as RefObject<SyncParams>
    const syncStateRef = {
      current: {
        elapsedTime: 0,
        isPaused: true,
        isStarted: false,
        revision: 0,
        totalDuration: 60,
      },
    } as RefObject<TimerState>
    const setParams = vi.fn()
    const paramData = {
      readTimerUrlState: () => urlState,
      setParams,
    } as unknown as ReturnType<typeof useParams>

    const { result } = renderHook(() =>
      useSyncConflictResolution({
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

    expect(setParams).toHaveBeenCalledWith(projectedParams)
    expect(syncParamsRef.current).toEqual(projectedParams)
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
        bg: "#000000",
        fg: "#ffffff",
        m: "01",
        pc: "#00aa88",
        s: "00",
        title: "Server state",
      },
    } as RefObject<SyncParams>
    const syncStateRef = {
      current: {
        elapsedTime: 5,
        isPaused: true,
        isStarted: false,
        revision: 2,
        totalDuration: 60,
      },
    } as RefObject<TimerState>
    const setParams = vi.fn()
    const paramData = {
      readTimerUrlState: () => urlState,
      setParams,
    } as unknown as ReturnType<typeof useParams>

    const { result } = renderHook(() =>
      useSyncConflictResolution({
        paramData,
        remoteRole: "control",
        syncParamsRef,
        syncStateRef,
      }),
    )

    const reconnectSnapshot = result.current.getReconnectSnapshot()

    expect(setParams).toHaveBeenCalledWith({
      bg: "#111111",
      fg: "#eeeeee",
      m: "02",
      pc: "#ff8800",
      s: "30",
      title: "Opening",
    })
    expect(reconnectSnapshot).toEqual({
      params: {
        bg: "#111111",
        fg: "#eeeeee",
        m: "02",
        pc: "#ff8800",
        s: "30",
        title: "Opening",
      },
      state: {
        elapsedTime: 5,
        isPaused: true,
        isStarted: false,
        revision: 2,
        totalDuration: 150,
      },
    })
  })
})
