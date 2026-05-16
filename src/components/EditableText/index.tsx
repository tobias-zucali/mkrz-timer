import type { InputHTMLAttributes } from "react"

export default function EditableText({
  disabled = false,
  onChange,
  title,
  value,
  ...otherProps
}: {
  disabled?: boolean
  onChange: (value: string) => void
  title?: string
  value: string
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "title" | "value"
>) {
  return (
    <input
      aria-label="Title"
      autoComplete="off"
      className="bg-transparent"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => event.stopPropagation()}
      onKeyUp={(event) => event.stopPropagation()}
      spellCheck={false}
      title={title}
      type="text"
      value={value}
      {...otherProps}
    />
  )
}
