"use client"

import classNames from "classnames"
import type { KeyboardEvent } from "react"

import IconButton from "@/components/IconButton"
import { MinusIcon, PlusIcon } from "@/utils/icons"

function stopPropagation(event: KeyboardEvent<HTMLElement>) {
  event.stopPropagation()
}

export default function NumericStepperField({
  className,
  description,
  digitStyle = true,
  id,
  inputClassName,
  label,
  max,
  min,
  onChange,
  onStep,
  step = 1,
  value,
}: {
  className?: string
  description?: string
  digitStyle?: boolean
  id: string
  inputClassName?: string
  label: string
  max?: number
  min?: number
  onChange: React.ChangeEventHandler<HTMLInputElement>
  onStep: (direction: -1 | 1) => void
  step?: number
  value: string
}) {
  const labelId = `${id}-label`

  return (
    <div className={classNames("min-w-0 w-full", className)}>
      <label
        className="mb-2 block panel-label text-ink/74"
        htmlFor={id}
        id={labelId}
      >
        {label}
      </label>
      <div
        aria-labelledby={labelId}
        className="
          flex min-h-11 items-center gap-2 rounded-field border border-hairline
          bg-input-bg px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]
          outline-1 -outline-offset-1 outline-transparent
          focus-within:outline-2 focus-within:-outline-offset-2
          focus-within:outline-primary
        "
        role="group"
      >
        <IconButton
          appearance="surface"
          aria-describedby={labelId}
          aria-label="Decrease"
          className="bg-control text-ink/80 hover:border-primary/35 hover:text-primary"
          onClick={() => onStep(-1)}
          onKeyDown={stopPropagation}
          onKeyUp={stopPropagation}
          shape="soft"
          size="sm"
          tabIndex={-1}
          title="Decrease"
        >
          <MinusIcon className="size-4" />
        </IconButton>
        <input
          aria-describedby={description ? `${id}-desc` : undefined}
          aria-label={label}
          className={classNames(
            [
              "h-full min-w-0 flex-1 appearance-none bg-transparent text-center outline-none",
              "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
              "[&::-webkit-outer-spin-button]:appearance-none",
            ],
            digitStyle &&
              "font-mono text-[1.8rem] font-bold tracking-[0.04em] tabular-nums",
            inputClassName,
          )}
          id={id}
          inputMode="numeric"
          max={max}
          min={min}
          name={id}
          onChange={onChange}
          onKeyDown={stopPropagation}
          onKeyUp={stopPropagation}
          step={step}
          type="number"
          value={value}
        />
        <IconButton
          appearance="surface"
          aria-describedby={labelId}
          aria-label="Increase"
          className="bg-control text-ink/80 hover:border-primary/35 hover:text-primary"
          onClick={() => onStep(1)}
          onKeyDown={stopPropagation}
          onKeyUp={stopPropagation}
          shape="soft"
          size="sm"
          tabIndex={-1}
          title="Increase"
        >
          <PlusIcon className="size-4" />
        </IconButton>
      </div>
      {description ? (
        <p className="mt-2 text-sm/6 text-ink/68" id={`${id}-desc`}>
          {description}
        </p>
      ) : null}
    </div>
  )
}
