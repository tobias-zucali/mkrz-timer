"use client"

import PanelLabel from "@/components/PanelLabel"

type Option<T extends string> = {
  label: string
  value: T
}

type SegmentedControlProps<T extends string> = {
  activeClassName?: string
  label: string
  onChange: (value: T) => void
  options: Option<T>[]
  value: T
}

export default function SegmentedControl<T extends string>({
  activeClassName = "bg-primary text-ink hover:bg-primary-hover",
  label,
  onChange,
  options,
  value,
}: SegmentedControlProps<T>) {
  return (
    <div>
      <PanelLabel>{label}</PanelLabel>
      <div
        aria-label={label}
        className="flex overflow-hidden rounded-field border border-hairline"
        role="group"
      >
        {options.map((option, i) => (
          <button
            className={`
              min-h-11 flex-1 cursor-pointer font-display text-sm font-semibold transition
              ${i > 0 ? "border-l border-hairline" : ""}
              ${value === option.value ? activeClassName : "bg-input-bg text-ink/70 hover:text-ink"}
            `}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
