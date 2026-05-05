"use client"

import { createContext, HTMLAttributes, useState } from "react"

// fix typescript warning
declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number
  }
}

const defaultColors = {
  bg: "",
  fg: "",
  pc: "",
}

function normalizeHexColor(value: string) {
  const hex = value.replace(/^#/, "")

  if (hex.length === 3) {
    return hex
      .split("")
      .map((char) => char + char)
      .join("")
  }

  return hex
}

function hexToRgbChannels(value: string) {
  const normalized = normalizeHexColor(value)

  if (!/^[\da-fA-F]{6}$/.test(normalized)) {
    return value
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)

  return `${red} ${green} ${blue}`
}

export const ParamStyleContext = createContext({
  ...defaultColors,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setColors: (colors: typeof defaultColors) => {},
})

export default function ParamStyledBody({
  children,
  ...otherProps
}: HTMLAttributes<HTMLBodyElement> & {
  children: React.ReactNode
}) {
  const [colors, setColors] = useState(defaultColors)

  return (
    <body
      style={{
        ...(colors.bg ? { "--background": hexToRgbChannels(colors.bg) } : {}),
        ...(colors.fg ? { "--foreground": hexToRgbChannels(colors.fg) } : {}),
        ...(colors.pc ? { "--primary": hexToRgbChannels(colors.pc) } : {}),
      }}
      {...otherProps}
    >
      <ParamStyleContext
        value={{
          ...colors,
          setColors,
        }}
      >
        {children}
      </ParamStyleContext>
    </body>
  )
}
