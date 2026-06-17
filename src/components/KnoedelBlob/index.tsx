const BLOB_PATH =
  "M0.54,42.91C1.06,47.55 1.82,50.66 2.82,55.14C3.45,57.94 4.48,62.23 5.73,64.91C10.86,75.90 23.31,85.41 33.55,88.35C38.39,89.75 45.55,90.13 50.17,89.84C57.08,89.41 62.56,87.12 68.97,85.00C73.87,83.37 77.84,80.45 82.24,77.36C84.14,76.03 86.17,74.80 88.00,73.37C90.15,71.70 94.05,62.46 94.69,59.60C95.29,56.90 100.00,41.34 91.58,26.02C88.42,20.26 81.06,10.89 76.38,6.95C69.95,1.56 67.31,0.01 59.97,0.00C57.41,0.00 53.03,0.37 50.51,0.41C49.11,0.44 37.50,1.88 35.46,2.37C31.56,3.30 27.56,5.73 24.36,8.00C21.25,10.20 17.91,12.33 15.00,14.88C13.00,16.63 11.20,18.57 9.81,20.86C1.92,33.89 0.00,38.21 0.54,42.91Z"

/**
 * The brand "Knödel" blob shape. Used as wordmark accent and decorative motif.
 * Renders at the given size; colour defaults to currentColor (brand-500 via className).
 */
export default function KnoedelBlob({
  className = "",
  height,
  width,
  ...otherProps
}: {
  className?: string
  height: number
  width: number,
} & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      height={height}
      viewBox="0 0 100 90.13"
      width={width}
      xmlns="http://www.w3.org/2000/svg"
      {...otherProps}
    >
      <path d={BLOB_PATH} />
    </svg>
  )
}
