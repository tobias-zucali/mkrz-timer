"use client"

import classNames from "classnames"
import type { ReactNode, SelectHTMLAttributes } from "react"

import PanelLabel from "@/components/PanelLabel"
import { ChevronRightIcon } from "@/utils/icons"

type SelectFieldProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "className" | "id" | "onChange" | "value"
> & {
  children: ReactNode
  description?: string
  focusOutlineClassName?: string
  id: string
  label?: string
  onChange: React.ChangeEventHandler<HTMLSelectElement>
  value: string
}

export default function SelectField({
  children,
  description,
  focusOutlineClassName = "focus-within:outline-primary",
  id,
  label,
  onChange,
  value,
  ...otherProps
}: SelectFieldProps) {
  const describedBy = [
    otherProps["aria-describedby"],
    description && `${id}-desc`,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className="min-w-0">
      {label ? <PanelLabel htmlFor={id}>{label}</PanelLabel> : null}
      <div
        className={classNames(
          `
            relative flex min-h-11 items-center rounded-field border border-hairline
            bg-input-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]
            outline-1 -outline-offset-1 outline-transparent
            focus-within:outline-2 focus-within:-outline-offset-2
          `,
          focusOutlineClassName,
        )}
      >
        <select
          aria-describedby={describedBy || undefined}
          className="
            block size-full appearance-none bg-transparent pr-10 pl-3
            font-body text-base font-semibold text-ink outline-none sm:text-sm
          "
          id={id}
          onChange={onChange}
          value={value}
          {...otherProps}
        >
          {children}
        </select>
        <span
          aria-hidden="true"
          className="
            pointer-events-none absolute inset-y-0 right-3 flex items-center
            text-ink/54
          "
        >
          <ChevronRightIcon className="size-4 rotate-90" />
        </span>
      </div>
      {description ? (
        <p className="mt-2 text-sm/6 text-ink/68" id={`${id}-desc`}>
          {description}
        </p>
      ) : null}
    </div>
  )
}
