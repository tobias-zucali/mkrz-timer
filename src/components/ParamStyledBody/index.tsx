"use client";

import useParams from "@/utils/useParams";
import { HTMLAttributes } from "react";

declare module 'react' {
    interface CSSProperties {
        [key: `--${string}`]: string | number
    }
}

export default function ParamStyledBody({
  children,
  ...otherProps
}: HTMLAttributes<HTMLBodyElement> & {
  children: React.ReactNode
}) {
  const params = useParams();

  return (
    <body
      style={{
        "--background": params.params.bg,
        "--foreground": params.params.fg,
        "--primary": params.params.pc,        
      }}
      {...otherProps}
    >
      {children}
    </body>
  );
}
