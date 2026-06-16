"use client"

import type { ChangeEventHandler } from "react"

export default function ColorSwatchField({
  id,
  label,
  onChange,
  value,
}: {
  id: string
  label: string
  onChange: ChangeEventHandler<HTMLInputElement>
  value: string
}) {
  return (
    <label
      className="
        flex items-center gap-4 rounded-xl border border-ink/12
        bg-white/3 px-4 py-3
      "
      htmlFor={id}
    >
      <input
        className="
          h-11 w-14 cursor-pointer rounded-lg border border-ink/15
          bg-transparent
        "
        id={id}
        name={id}
        onChange={onChange}
        onKeyDown={(event) => event.stopPropagation()}
        onKeyUp={(event) => event.stopPropagation()}
        type="color"
        value={value}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span
          className="
          mt-0.5 block font-mono text-xs tracking-[0.08em] text-ink/55
          uppercase
        "
        >
          {value}
        </span>
      </span>
    </label>
  )
}
