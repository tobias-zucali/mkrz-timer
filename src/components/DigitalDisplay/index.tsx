import { useRef } from "react"
import classNames from "classnames"
import { useTranslations } from "next-intl"

import { getResponsiveClamp } from "@/utils/responsiveClamp"
import styles from "./index.module.css"

function DigitalDisplay({
  accessibleText,
  displayMode = "editable",
  isAlert = false,
  isReadonly = false,
  minutes,
  onBlur,
  onMinutesChange,
  onSecondsChange,
  seconds,
  ...otherProps
}: {
  accessibleText?: string
  displayMode?: "editable" | "readout"
  isAlert?: boolean
  minutes: string
  onMinutesChange: React.ChangeEventHandler<HTMLInputElement>
  onSecondsChange: React.ChangeEventHandler<HTMLInputElement>
  seconds: string
  isReadonly?: boolean
  onBlur?: () => void
  style?: React.CSSProperties
}) {
  const t = useTranslations("DigitalDisplay")
  const minuteInputRef = useRef<HTMLInputElement>(null)
  const secondsInputRef = useRef<HTMLInputElement>(null)

  const inputClassNames = classNames(
    "inline-block w-8 flex-1 text-center font-mono font-bold tracking-[-0.05em] tabular-nums outline-none",
    styles.noSpinner,
  )
  const sharedClassName = classNames(
    "relative flex w-full content-center text-center font-mono font-bold tracking-[-0.05em] tabular-nums text-white drop-shadow-[0_14px_34px_rgba(214,31,105,0.2)]",
    isReadonly && displayMode === "editable" && "opacity-50",
    isAlert && classNames(styles.blink, "text-primary opacity-100"),
  )
  const sharedStyle = {
    fontFamily: "var(--font-mono)",
    fontSize: getResponsiveClamp({
      max: 8,
      min: 3,
    }),
  }

  if (displayMode === "readout") {
    return (
      <output
        aria-atomic="true"
        aria-label={accessibleText ?? t("timerReadout")}
        className={sharedClassName}
        role="timer"
        style={sharedStyle}
        {...otherProps}
      >
        <span aria-hidden="true" className="inline-block flex-1 text-right">
          {minutes}
        </span>
        <span aria-hidden="true" className="px-[0.04em]">
          {" : "}
        </span>
        <span aria-hidden="true" className="inline-block flex-1 text-left">
          {seconds}
        </span>
      </output>
    )
  }

  return (
    <div
      aria-label={t("timerDuration")}
      className={sharedClassName}
      role="group"
      style={sharedStyle}
      {...otherProps}
    >
      <input
        aria-label={t("minutes")}
        className={classNames(inputClassNames, "text-right")}
        data-timer-duration-input="true"
        min="0"
        readOnly={isReadonly}
        ref={minuteInputRef}
        type="number"
        value={minutes}
        onKeyDown={({ key }) => {
          if (minuteInputRef.current && key === ":") {
            minuteInputRef.current.focus()
          }
        }}
        onBlur={onBlur}
        onChange={onMinutesChange}
      />
      <div className="px-[0.04em]">{" : "}</div>
      <input
        aria-label={t("seconds")}
        className={classNames(inputClassNames, "text-left")}
        data-timer-duration-input="true"
        max="60"
        min="0"
        onBlur={onBlur}
        onChange={onSecondsChange}
        readOnly={isReadonly}
        ref={secondsInputRef}
        type="number"
        value={seconds}
      />
    </div>
  )
}

export default DigitalDisplay
