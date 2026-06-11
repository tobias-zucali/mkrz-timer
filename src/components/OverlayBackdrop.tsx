"use client"

type OverlayBackdropProps = {
  ariaLabel?: string
  className?: string
  onClick?: () => void
}

export const overlayBackdropClassName = "bg-foreground/14 backdrop-blur-[3px]"

export default function OverlayBackdrop({
  ariaLabel,
  className = "",
  onClick,
}: OverlayBackdropProps) {
  if (onClick) {
    return (
      <button
        aria-label={ariaLabel}
        className={`absolute inset-0 z-0 ${overlayBackdropClassName} ${className}`.trim()}
        onClick={onClick}
        tabIndex={-1}
        type="button"
      />
    )
  }

  return (
    <div
      className={`absolute inset-0 z-0 ${overlayBackdropClassName} ${className}`.trim()}
    />
  )
}
