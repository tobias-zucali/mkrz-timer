import type { InputHTMLAttributes } from "react"

type CheckboxFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "checked" | "id" | "onChange" | "type"
> & {
  checked: boolean
  id: string
  label: string
  onChange: React.ChangeEventHandler<HTMLInputElement>
}

export default function CheckboxField({
  checked,
  id,
  label,
  onChange,
  ...otherProps
}: CheckboxFieldProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3" htmlFor={id}>
      <input
        checked={checked}
        className="mt-1 size-4 accent-primary"
        id={id}
        onChange={onChange}
        type="checkbox"
        {...otherProps}
      />
      <span className="block text-sm font-medium text-ink">{label}</span>
    </label>
  )
}
