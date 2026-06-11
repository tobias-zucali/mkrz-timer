import tailwindConfig from "../../../tailwind.config"

type ScreenName = "sm" | "md" | "lg" | "xl" | "2xl"

function parseScreenPixels(screenValue: string) {
  if (screenValue.endsWith("px")) {
    return Number(screenValue.slice(0, -2))
  }

  throw new Error(`Unsupported Tailwind screen unit: ${screenValue}`)
}

export function getTailwindScreen(name: ScreenName) {
  const screenValue = tailwindConfig.theme?.screens?.[name]

  if (typeof screenValue !== "string") {
    throw new Error(`Missing Tailwind screen value for "${name}"`)
  }

  return screenValue
}

export function getMaxWidthBelowTailwindScreen(name: ScreenName) {
  const screenPixels = parseScreenPixels(getTailwindScreen(name))
  return `${screenPixels - 0.02}px`
}
