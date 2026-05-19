import classNames from "classnames"
import { forwardRef } from "react"
import type { ButtonHTMLAttributes } from "react"

import { XMarkIcon } from "@/utils/icons"

const closeButtonClassName =
  "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-foreground/12 bg-foreground/4 text-foreground/72 transition hover:bg-foreground/8 hover:text-foreground focus:outline-2 focus:-outline-offset-2 focus:outline-primary"

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
      {children ?? <XMarkIcon className="h-5 w-5" />}
    </button>
  ),
)

CloseButton.displayName = "CloseButton"

export default CloseButton
