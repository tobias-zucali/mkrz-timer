import { useRef } from "react"
import classNames from "classnames"
import { useTranslations } from "next-intl"

import { getResponsiveClamp } from "@/utils/responsiveClamp"
import styles from "./index.module.css"

function DigitalDisplay({
  isAlert = false,
  isReadonly = false,
  minutes,
  onBlur,
  onMinutesChange,
  onSecondsChange,
  seconds,
  ...otherProps
}: {
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

  return (
    <div
      className={classNames(
        "relative flex w-full content-center text-center font-mono font-bold",
        isReadonly && "opacity-50",
        isAlert && classNames(styles.blink, "text-primary opacity-100"),
      )}
      style={{
        fontSize: getResponsiveClamp({
          max: 8,
          min: 3,
        }),
      }}
      {...otherProps}
    >
      <input
        aria-label={t("minutes")}
        className={classNames(inputClassNames, "text-right")}
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
