import classNames from "classnames"
import { useId } from "react"

import PanelLabel from "@/components/PanelLabel"
import styles from "@/components/InputField/index.module.css"

const baseInputClassName = classNames(
  "block h-10 w-full rounded-field",
  "text-base text-ink placeholder:text-ink/42",
  "outline-1 -outline-offset-1 outline-transparent",
  "focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6",
)

export default function InputField({
  containerClassName,
  description,
  label,
  id,
  className,
  children,
  digitStyle = false,
  ...otherProps
}: {
  containerClassName?: string
  description?: string
  digitStyle?: boolean
  id: string
  label: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  children?: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const hasInsetPadding =
    otherProps.type !== "color" && otherProps.type !== "number"

  const fallbackId = useId()
  const inputId = id || fallbackId

  return (
    <div className={classNames("w-full", containerClassName)}>
      <PanelLabel htmlFor={inputId}>{label}</PanelLabel>
      <div className="flex items-stretch">
        <input
          aria-describedby={description && `${inputId}-desc`}
          id={inputId}
          type="text"
          name={inputId}
          autoComplete="off"
          className={classNames(
            otherProps.type !== "color" && "pl-3",
            hasInsetPadding && "pr-3",
            otherProps.type === "number" && styles.numberInput,
            digitStyle && "font-mono text-[1.8rem] font-bold tracking-[0.04em]",
            "border border-hairline bg-input-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
            baseInputClassName,
            className,
          )}
          onKeyDown={(event) => {
            event.stopPropagation()
            otherProps.onKeyDown?.(event)
          }}
          onKeyUp={(event) => {
            event.stopPropagation()
            otherProps.onKeyUp?.(event)
          }}
          {...otherProps}
        />
        {children}
      </div>
      {description && (
        <p className="mt-2 text-sm/6 text-ink/68" id={`${inputId}-desc`}>
          {description}
        </p>
      )}
    </div>
  )
}
