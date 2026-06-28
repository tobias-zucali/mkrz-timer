import classNames from "classnames"
import type { LabelHTMLAttributes, HTMLAttributes, ReactNode } from "react"

type PanelLabelProps = (
  | (LabelHTMLAttributes<HTMLLabelElement> & { htmlFor: string })
  | (HTMLAttributes<HTMLParagraphElement> & { htmlFor?: undefined })
) & { children: ReactNode; className?: string }

export default function PanelLabel({
  children,
  className,
  htmlFor,
  ...otherProps
}: PanelLabelProps) {
  const shared = classNames("mb-2 block panel-label text-ink/74", className)

  if (htmlFor) {
    return (
      <label
        className={shared}
        htmlFor={htmlFor}
        {...(otherProps as LabelHTMLAttributes<HTMLLabelElement>)}
      >
        {children}
      </label>
    )
  }

  return (
    <p
      className={shared}
      {...(otherProps as HTMLAttributes<HTMLParagraphElement>)}
    >
      {children}
    </p>
  )
}
