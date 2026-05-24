"use client"

import classNames from "classnames"
import { forwardRef } from "react"
import type { ButtonHTMLAttributes } from "react"
import { useTranslations } from "next-intl"

import { XMarkIcon } from "@/utils/icons"

const closeButtonClassName =
  "inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-foreground/12 bg-foreground/4 text-foreground/72 transition hover:bg-foreground/8 hover:text-foreground focus:outline-2 focus:-outline-offset-2 focus:outline-primary"

const CloseButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(
  (
    { title, className, children, "aria-label": ariaLabel, ...otherProps },
    ref,
  ) => {
    const t = useTranslations("CloseButton")
    const resolvedTitle = title ?? t("close")

    return (
      <button
        aria-label={ariaLabel ?? resolvedTitle}
        className={classNames(closeButtonClassName, className)}
        ref={ref}
        title={resolvedTitle}
        type="button"
        {...otherProps}
      >
        {children ?? <XMarkIcon className="size-5" />}
      </button>
    )
  },
)

CloseButton.displayName = "CloseButton"

export default CloseButton
