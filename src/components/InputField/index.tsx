import classNames from "classnames"
import { useId } from "react"

const baseInputClassName = classNames(
  "block h-10 w-full rounded-md",
  "bg-background text-base text-foreground",
  "outline-1 -outline-offset-1 outline-foreground/10 placeholder:text-foreground/50",
  "focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6",
)

export default function InputField({
  containerClassName,
  description,
  label,
  id,
  className,
  children,
  ...otherProps
}: {
  containerClassName?: string
  description?: string
  label: string
  id: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  children?: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const hasInsetPadding =
    otherProps.type !== "color" && otherProps.type !== "number"

  const fallbackId = useId()
  const inputId = id || fallbackId

  return (
    <div className={classNames("w-full", containerClassName)}>
      <label
        className="mb-2 block text-sm font-medium text-foreground"
        htmlFor={inputId}
      >
        {label}
      </label>
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
            "border border-foreground/10",
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
        <p className="text-sm/6 text-foreground/68" id={`${inputId}-desc`}>
          {description}
        </p>
      )}
    </div>
  )
}
