import type { ReactNode } from "react"

export default function LocaleFallbackNotice({
  children,
}: {
  children: ReactNode
}) {
  return (
    <p className="inline-flex rounded-full border border-primary/50 bg-primary/12 px-3 py-1 text-sm text-foreground/88">
      {children}
    </p>
  )
}
