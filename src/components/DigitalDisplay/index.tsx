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
    "inline-block flex-1 text-center w-8 outline-none",
    styles.noSpinner,
  )
  const sharedClassName = classNames(
    "relative flex w-full content-center text-center font-mono font-bold",
    isReadonly && displayMode === "editable" && "opacity-50",
    isAlert && classNames(styles.blink, "text-primary opacity-100"),
  )
  const sharedStyle = {
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
        <span aria-hidden="true">{" : "}</span>
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
      <div>{" : "}</div>
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
