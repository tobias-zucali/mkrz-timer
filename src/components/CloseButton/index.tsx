import classNames from "classnames"
import { forwardRef } from "react"
import type { ButtonHTMLAttributes } from "react"

const closeButtonClassName =
  "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-foreground/12 bg-foreground/4 text-foreground/72 transition hover:bg-foreground/8 hover:text-foreground focus:outline-2 focus:-outline-offset-2 focus:outline-primary"

function CloseGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

const CloseButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(
  (
    {
      title = "Close",
      className,
      children,
      "aria-label": ariaLabel,
      ...otherProps
    },
    ref,
  ) => (
    <button
      aria-label={ariaLabel ?? title}
      className={classNames(closeButtonClassName, className)}
      ref={ref}
      title={title}
      type="button"
      {...otherProps}
    >
      {children ?? <CloseGlyph />}
    </button>
  ),
)

CloseButton.displayName = "CloseButton"

export default CloseButton
