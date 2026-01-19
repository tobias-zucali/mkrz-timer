import classNames from "classnames"
import styles from "./index.module.css"

export default function AnimatedBell({
  className,
  ...otherProps
}: {
  className: string
}) {
  return (
    <svg
      className={classNames("bg-secondary", className)}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 24 24"
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
      {...otherProps}
    >
      <g
        className={styles["bell-u-sound_ts"]}
        transform="translate(11.998735,12) scale(1,1)"
      >
        <path
          className={styles["bell-u-sound"]}
          d="M5.85,3.5c.113-.135.175-.306.175-.482c0-.412-.338-.75-.75-.75-.204,0-.401.084-.542.232C3.505,3.87,2.69,5.561,2.385,7.376c-.005.036-.008.072-.008.108c0,.411.339.75.75.75.359,0,.67-.258.737-.61.258-1.535.947-2.965,1.986-4.124Zm13.417-1c-.142-.161-.347-.253-.562-.253-.411,0-.75.338-.75.75c0,.186.069.365.194.503c1.039,1.159,1.729,2.589,1.987,4.124.06.36.375.626.74.626.412,0,.75-.338.75-.75c0-.042-.003-.083-.01-.124-.306-1.815-1.121-3.506-2.35-4.876h.001Z"
          transform="translate(-11.998619,-11.999978)"
          clipRule="evenodd"
          strokeLinejoin="round"
          strokeMiterlimit="2"
        />
      </g>
      <g
        className={styles["bell-u-bell_tr"]}
        transform="translate(12.0015,0) rotate(-2)"
      >
        <path
          className={styles["bell-u-bell"]}
          d="M12,2.25C8.297,2.25,5.25,5.297,5.25,9v.75c.003,2.039-.753,4.007-2.119,5.52-.124.138-.193.317-.193.502c0,.314.197.596.491.704c1.544.57,4.779,1.525,8.573,1.525c3.791,0,7.004-.949,8.568-1.526.294-.109.49-.39.49-.704c0-.185-.068-.363-.192-.501-1.366-1.513-2.121-3.482-2.118-5.52v-.75c0-3.703-3.047-6.75-6.75-6.75Z"
          transform="translate(-12.0015,0)"
          clipRule="evenodd"
          fillRule="evenodd"
          strokeLinejoin="round"
          strokeMiterlimit="2"
        />
      </g>
      <g
        className={styles["bell-u-stick_tr"]}
        transform="translate(12.0015,0) rotate(12)"
      >
        <path
          className={styles["bell-u-stick"]}
          d="M11.998,14.393c1.689,0,3.06,1.371,3.06,3.06s-1.371,3.06-3.06,3.06-3.06-1.371-3.06-3.06s1.371-3.06,3.06-3.06Zm0,1.167c1.045,0,1.893.848,1.893,1.893s-.848,1.893-1.893,1.893-1.893-.848-1.893-1.893.848-1.893,1.893-1.893Z"
          transform="translate(-12.0015,0)"
          clipRule="evenodd"
          fillRule="evenodd"
          strokeLinejoin="round"
          strokeMiterlimit="2"
        />
      </g>
    </svg>
  )
}
