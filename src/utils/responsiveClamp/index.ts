export function getResponsiveClamp({
  factor = 16,
  max,
  min,
  unit = "rem",
}: {
  factor?: number
  max: number
  min: number
  unit?: "em" | "rem"
}) {
  return `clamp(${min}${unit}, min(${factor}vw, ${factor}vh), ${max}${unit})`
}
