"use client";

import useParams from "@/utils/useParams";
import { createContext, HTMLAttributes, useState } from "react";


// fix typescript warning
declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}

const defaultColors = {
  "bg": "",
  "fg": "",
  "pc": "",
}

export const ParamStyleContext = createContext({
  ...defaultColors,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setColors: (colors: typeof defaultColors) => { },
});

export default function ParamStyledBody({
  children,
  ...otherProps
}: HTMLAttributes<HTMLBodyElement> & {
  children: React.ReactNode;
}) {
  const [colors, setColors] = useState(defaultColors)

  return (
    <body
      style={{
        ...(colors.bg ? {"--background": colors.bg} : {}),
        ...(colors.fg ? {"--foreground": colors.fg} : {}),
        ...(colors.pc ? {"--primary": colors.pc} : {}),
      }}
      {...otherProps}
    >
      <ParamStyleContext value={{
        ...colors,
        setColors,
      }}>
        {children}
      </ParamStyleContext>
    </body>
  );
}
