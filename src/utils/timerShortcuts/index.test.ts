import { describe, expect, it } from "vitest"

import { getTimerShortcutIntent } from "."

const buildKeyboardEvent = (
  key: string,
  target?: HTMLElement,
  overrides?: Partial<
    Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "repeat">
  >,
) =>
  ({
    altKey: false,
    ctrlKey: false,
    key,
    metaKey: false,
    repeat: false,
    target: target ?? document.body,
    ...overrides,
  }) satisfies Pick<
    KeyboardEvent,
    "altKey" | "ctrlKey" | "key" | "metaKey" | "repeat" | "target"
  >

describe("getTimerShortcutIntent", () => {
  it("maps the supported timer shortcuts", () => {
    expect(getTimerShortcutIntent(buildKeyboardEvent(" "))).toBe("toggle")
    expect(getTimerShortcutIntent(buildKeyboardEvent("Enter"))).toBe("toggle")
    expect(getTimerShortcutIntent(buildKeyboardEvent("p"))).toBe("pause")
    expect(getTimerShortcutIntent(buildKeyboardEvent("r"))).toBe("reset")
    expect(getTimerShortcutIntent(buildKeyboardEvent("Escape"))).toBe("reset")
    expect(getTimerShortcutIntent(buildKeyboardEvent("ArrowLeft"))).toBe(
      "previous",
    )
    expect(getTimerShortcutIntent(buildKeyboardEvent("ArrowRight"))).toBe(
      "next",
    )
    expect(getTimerShortcutIntent(buildKeyboardEvent("ArrowUp"))).toBe(
      "increase-minute",
    )
    expect(getTimerShortcutIntent(buildKeyboardEvent("ArrowDown"))).toBe(
      "decrease-minute",
    )
  })

  it("ignores repeated keydown events", () => {
    expect(
      getTimerShortcutIntent(
        buildKeyboardEvent(" ", undefined, { repeat: true }),
      ),
    ).toBeNull()
  })

  it("ignores editable targets", () => {
    const input = document.createElement("input")
    const textarea = document.createElement("textarea")
    const select = document.createElement("select")
    const editable = document.createElement("div")
    editable.setAttribute("contenteditable", "true")

    expect(getTimerShortcutIntent(buildKeyboardEvent("r", input))).toBeNull()
    expect(getTimerShortcutIntent(buildKeyboardEvent(" ", textarea))).toBeNull()
    expect(
      getTimerShortcutIntent(buildKeyboardEvent("ArrowUp", select)),
    ).toBeNull()
    expect(getTimerShortcutIntent(buildKeyboardEvent("p", editable))).toBeNull()
  })

  it("allows Space and Enter only from marked timer duration inputs", () => {
    const durationInput = document.createElement("input")
    durationInput.dataset.timerDurationInput = "true"

    expect(getTimerShortcutIntent(buildKeyboardEvent(" ", durationInput))).toBe(
      "toggle",
    )
    expect(
      getTimerShortcutIntent(buildKeyboardEvent("Enter", durationInput)),
    ).toBe("toggle")
    expect(
      getTimerShortcutIntent(buildKeyboardEvent("ArrowUp", durationInput)),
    ).toBeNull()
  })

  it("defers Space and Enter to focused native buttons", () => {
    const button = document.createElement("button")

    expect(getTimerShortcutIntent(buildKeyboardEvent(" ", button))).toBeNull()
    expect(
      getTimerShortcutIntent(buildKeyboardEvent("Enter", button)),
    ).toBeNull()
    expect(getTimerShortcutIntent(buildKeyboardEvent("r", button))).toBe(
      "reset",
    )
  })
})
