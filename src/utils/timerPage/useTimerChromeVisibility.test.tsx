import { act, renderHook } from "@testing-library/react"

import useTimerChromeVisibility from "./useTimerChromeVisibility"

function dispatchPointerMove() {
  document.dispatchEvent(new Event("pointermove", { bubbles: true }))
}

describe("useTimerChromeVisibility", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ""
  })

  it("starts with fully visible controls", () => {
    const { result } = renderHook(() => useTimerChromeVisibility())

    expect(result.current.isControlsActive).toBe(true)
  })

  it("dims controls after five seconds of inactivity", () => {
    const { result } = renderHook(() => useTimerChromeVisibility())

    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    expect(result.current.isControlsActive).toBe(false)
  })

  it("restores full visibility on keyboard and pointer activity", () => {
    const { result } = renderHook(() => useTimerChromeVisibility())

    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    expect(result.current.isControlsActive).toBe(false)

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }))
    })

    expect(result.current.isControlsActive).toBe(true)

    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    expect(result.current.isControlsActive).toBe(false)

    act(() => {
      dispatchPointerMove()
    })

    expect(result.current.isControlsActive).toBe(true)
  })

  it("stays visible while a control element keeps focus", () => {
    const control = document.createElement("button")
    control.type = "button"
    control.setAttribute("data-timer-chrome-focus-lock", "true")
    document.body.appendChild(control)

    const { result } = renderHook(() => useTimerChromeVisibility())

    act(() => {
      control.focus()
    })

    expect(result.current.isControlsActive).toBe(true)

    act(() => {
      vi.advanceTimersByTime(5_000)
    })

    expect(result.current.isControlsActive).toBe(true)

    act(() => {
      control.blur()
      vi.advanceTimersByTime(5_000)
    })

    expect(result.current.isControlsActive).toBe(false)
  })

  it("still dims while focus stays on a timer control without focus lock", () => {
    const control = document.createElement("button")
    control.type = "button"
    document.body.appendChild(control)

    const { result } = renderHook(() => useTimerChromeVisibility())

    act(() => {
      control.focus()
      vi.advanceTimersByTime(5_000)
    })

    expect(result.current.isControlsActive).toBe(false)
  })
})
