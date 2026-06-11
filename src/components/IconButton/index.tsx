"use client"

import classNames from "classnames"
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"

type IconButtonAppearance = "ghost" | "outline" | "surface"
type IconButtonShape = "round" | "soft" | "square"
type IconButtonSize = "field" | "nav" | "sm"

const sizeClassNames: Record<IconButtonSize, string> = {
  field: "size-10",
  nav: "size-9",
  sm: "size-8",
}

const shapeClassNames: Record<IconButtonShape, string> = {
  round: "rounded-full",
  soft: "rounded-lg",
  square: "rounded-xl",
}

export function getIconButtonClassName({
  appearance = "outline",
  className,
  isActive = false,
  shape = "square",
  size = "sm",
}: {
  appearance?: IconButtonAppearance
  className?: string
  isActive?: boolean
  shape?: IconButtonShape
  size?: IconButtonSize
}) {
  return classNames(
    "inline-flex shrink-0 cursor-pointer items-center justify-center transition",
    "focus:outline-2 focus:-outline-offset-2 focus:outline-primary",
    "disabled:cursor-not-allowed disabled:opacity-50",
    sizeClassNames[size],
    shapeClassNames[shape],
    appearance === "outline" &&
      "border border-foreground/12 text-foreground/72 hover:border-primary/40 hover:text-foreground",
    appearance === "surface" &&
      "border border-foreground/10 bg-foreground/6 text-foreground/80 hover:bg-foreground/12 hover:text-foreground",
    appearance === "ghost" &&
      (isActive ? "text-primary" : "text-foreground/78 hover:text-primary"),
    className,
  )
}

const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    appearance?: IconButtonAppearance
    children: ReactNode
    isActive?: boolean
    shape?: IconButtonShape
    size?: IconButtonSize
    title: string
  }
>(
  (
    {
      appearance = "outline",
      children,
      className,
      isActive = false,
      shape = "square",
      size = "sm",
      title,
      type = "button",
      "aria-label": ariaLabel,
      ...otherProps
    },
    ref,
  ) => (
    <button
      aria-label={ariaLabel ?? title}
      className={getIconButtonClassName({
        appearance,
        className,
        isActive,
        shape,
        size,
      })}
      ref={ref}
      title={title}
      type={type}
      {...otherProps}
    >
      {children}
    </button>
  ),
)

IconButton.displayName = "IconButton"

export default IconButton
