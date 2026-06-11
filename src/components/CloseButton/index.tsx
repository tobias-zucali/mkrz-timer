"use client"

import { forwardRef } from "react"
import type { ButtonHTMLAttributes } from "react"
import { useTranslations } from "next-intl"

import IconButton from "@/components/IconButton"
import { XMarkIcon } from "@/utils/icons"

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
      <IconButton
        aria-label={ariaLabel ?? resolvedTitle}
        appearance="surface"
        className={className}
        ref={ref}
        shape="round"
        size="field"
        title={resolvedTitle}
        {...otherProps}
      >
        {children ?? <XMarkIcon className="size-5" />}
      </IconButton>
    )
  },
)

CloseButton.displayName = "CloseButton"

export default CloseButton
