"use client"

import type { ChangeEvent, ChangeEventHandler, KeyboardEvent } from "react"
import { useMemo, useRef } from "react"

const DEFAULT_SWATCHES = ["#d61f69", "#ef9e3b", "#2f7fd6", "#34b87a", "#8a55d6"]

function stopPropagation(event: KeyboardEvent<HTMLElement>) {
  event.stopPropagation()
}

export default function ColorSwatchField({
  id,
  label,
  onChange,
  swatches = DEFAULT_SWATCHES,
  value,
}: {
  id: string
  label: string
  onChange: ChangeEventHandler<HTMLInputElement>
  swatches?: string[]
  value: string
}) {
  const colorInputRef = useRef<HTMLInputElement>(null)
  const normalizedValue = value.toUpperCase()
  const hasCustomValue = useMemo(
    () =>
      !swatches.some((swatch) => swatch.toLowerCase() === value.toLowerCase()),
    [swatches, value],
  )

  const emitValue = (nextValue: string) => {
    onChange({
      target: {
        value: nextValue,
      },
    } as ChangeEvent<HTMLInputElement>)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="block panel-label text-ink/74" htmlFor={id}>
          {label}
        </label>
        <span className="font-mono text-xs tracking-[0.14em] text-ink/58 uppercase">
          {normalizedValue}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {swatches.map((swatch) => {
          const isSelected = swatch.toLowerCase() === value.toLowerCase()

          return (
            <button
              aria-label={`Preset ${swatch}`}
              className={`
                relative inline-flex size-10 shrink-0 cursor-pointer items-center
                justify-center rounded-full border transition focus:outline-2
                focus:-outline-offset-2 focus:outline-primary
              `}
              key={swatch}
              onClick={(event) => {
                event.stopPropagation()
                emitValue(swatch)
              }}
              onKeyDown={stopPropagation}
              onKeyUp={stopPropagation}
              style={{
                backgroundColor: swatch,
                borderColor: isSelected
                  ? "rgba(255,255,255,0.9)"
                  : "rgba(255,255,255,0.18)",
                boxShadow: isSelected
                  ? "0 0 0 2px rgba(214,31,105,0.55), inset 0 0 0 2px rgba(255,255,255,0.8)"
                  : "inset 0 0 0 1px rgba(255,255,255,0.35)",
              }}
              type="button"
            >
              {isSelected ? (
                <span className="text-lg leading-none font-bold text-white">
                  ✓
                </span>
              ) : null}
            </button>
          )
        })}
        <button
          aria-label="Custom swatch"
          className={`
            inline-flex size-10 shrink-0 cursor-pointer items-center justify-center
            rounded-full border bg-input-bg text-xl text-ink/74 transition
            hover:border-primary/50 hover:text-primary focus:outline-2
            focus:-outline-offset-2 focus:outline-primary
            ${hasCustomValue ? "" : "border-dashed border-ink/26"}
          `}
          onClick={(event) => {
            event.stopPropagation()
            colorInputRef.current?.click()
          }}
          onKeyDown={stopPropagation}
          onKeyUp={stopPropagation}
          style={
            hasCustomValue
              ? {
                  backgroundColor: value,
                  borderColor: "rgba(255,255,255,0.9)",
                  borderWidth: "2px",
                  boxShadow: `0 0 0 2px ${value}55, inset 0 0 0 2px rgba(255,255,255,0.85)`,
                  color: "rgba(255,255,255,0.96)",
                }
              : undefined
          }
          type="button"
        >
          {hasCustomValue ? (
            <svg
              aria-hidden="true"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L9.75 17.963 6 18.75l.787-3.75 10.075-10.513Z" />
              <path d="M15.75 5.625 18.375 8.25" />
            </svg>
          ) : (
            <span>+</span>
          )}
        </button>
        <input
          aria-label={label}
          className="sr-only"
          id={id}
          name={id}
          onChange={onChange}
          onKeyDown={(event) => event.stopPropagation()}
          onKeyUp={(event) => event.stopPropagation()}
          ref={colorInputRef}
          type="color"
          value={value}
        />
      </div>
    </div>
  )
}
