import classNames from "classnames"

export default function InputField({
  containerClassName,
  label,
  id,
  className,
  children,
  ...otherProps
}: {
  containerClassName?: string
  label: string
  id: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  children?: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={classNames("pt-2 w-full", containerClassName)}>
      <label htmlFor={id} className="block text-sm/6 font-medium">
        {label}
      </label>
      <div className="flex items-stretch">
        <input
          id={id}
          type="text"
          name={id}
          autoComplete="given-name"
          className={classNames(
            otherProps.type !== "color" && "pl-3",
            otherProps.type !== "color" &&
              otherProps.type !== "number" &&
              "pr-3",
            "block w-full rounded-md h-10",
            "bg-foreground/15 text-base text-foreground",
            "outline-1 -outline-offset-1 outline-foreground/10 placeholder:text-foreground/50",
            "focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6",
            className,
          )}
          {...otherProps}
        />
        {children}
      </div>
    </div>
  )
}
