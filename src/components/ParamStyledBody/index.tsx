"use client"

import { createContext, HTMLAttributes, useState } from "react"
import type { AppTheme } from "@/shared/liveSession/types"

type ParamStyleContextValue = {
  theme: AppTheme
  pc: string
  setTheme: React.Dispatch<React.SetStateAction<AppTheme>>
  setPc: React.Dispatch<React.SetStateAction<string>>
}

export const ParamStyleContext = createContext<ParamStyleContextValue>({
  theme: "dark" as AppTheme,
  pc: "",
  setTheme: () => {},
  setPc: () => {},
})

export default function ParamStyledBody({
  children,
  ...otherProps
}: HTMLAttributes<HTMLBodyElement> & {
  children: React.ReactNode
}) {
  const [theme, setTheme] = useState<AppTheme>("dark")
  const [pc, setPc] = useState("")

  return (
    <body
      data-theme={theme}
      style={
        pc
          ? ({
              "--color-primary": pc,
              "--color-primary-hover": `color-mix(in srgb, ${pc} 85%, black)`,
            } as React.CSSProperties)
          : undefined
      }
      {...otherProps}
    >
      <ParamStyleContext
        value={{
          theme,
          pc,
          setTheme,
          setPc,
        }}
      >
        {children}
      </ParamStyleContext>
    </body>
  )
}
