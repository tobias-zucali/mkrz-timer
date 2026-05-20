"use client"

import { useEffect, useRef } from "react"

import InputField from "@/components/InputField"
import { MAX_TITLE_LENGTH } from "@/shared/security/input"
import ColorSwatchField from "@/utils/ColorSwatchField"

export default function TimerPanel({
  handleChange,
  handleTimeBlur,
  params,
}: {
  handleChange: (key: string, value: string) => void
  handleTimeBlur: () => void
  params: {
    m: string
    pc: string
    s: string
    title: string
  }
}) {
  const titleFieldRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const titleField = titleFieldRef.current
    if (!titleField) {
      return
    }

    titleField.style.height = "2.5rem"
    titleField.style.height = `${Math.max(40, titleField.scrollHeight)}px`
  }, [params.title])

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Timer</h3>
          <p className="mt-1 text-sm/6 text-foreground/68">
            Adjust the timer directly from the sidebar.
          </p>
        </div>
        <div className="space-y-4 pt-2">
          <div className="w-full">
            <label
              className="mb-2 block text-sm font-medium text-foreground"
              htmlFor="sidebar-title"
            >
              Title
            </label>
            <textarea
              className="
                block h-10 min-h-10 w-full resize-none overflow-hidden
                rounded-md border border-foreground/10 bg-background px-3 py-2
                text-sm/6 text-foreground outline-1 -outline-offset-1
                outline-foreground/10
                placeholder:text-foreground/50
                focus:outline-2 focus:-outline-offset-2 focus:outline-primary
              "
              id="sidebar-title"
              maxLength={MAX_TITLE_LENGTH}
              name="sidebar-title"
              onChange={(event) => handleChange("title", event.target.value)}
              onInput={(event) => {
                const target = event.currentTarget
                target.style.height = "2.5rem"
                target.style.height = `${Math.max(40, target.scrollHeight)}px`
              }}
              onKeyDown={(event) => event.stopPropagation()}
              onKeyUp={(event) => event.stopPropagation()}
              ref={titleFieldRef}
              rows={1}
              value={params.title}
            />
          </div>
          <div
            className="
            grid gap-4
            sm:grid-cols-2
          "
          >
            <InputField
              id="sidebar-minutes"
              inputMode="numeric"
              label="Minutes"
              onBlur={handleTimeBlur}
              onChange={(event) => handleChange("m", event.target.value)}
              type="number"
              value={params.m || 1}
            />
            <InputField
              id="sidebar-seconds"
              inputMode="numeric"
              label="Seconds"
              onBlur={handleTimeBlur}
              onChange={(event) => handleChange("s", event.target.value)}
              type="number"
              value={params.s || 0}
            />
          </div>
          <ColorSwatchField
            id="sidebar-primary"
            label="Primary Color"
            onChange={(event) => handleChange("pc", event.target.value)}
            value={params.pc}
          />
        </div>
      </section>
    </div>
  )
}
