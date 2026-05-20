import classNames from "classnames"
import { HTMLAttributes } from "react"

export default function HelpText({
  className,
  ...otherProps
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={classNames("grid gap-3 text-sm text-foreground/78", className)}
      {...otherProps}
    >
      <div
        className="
        grid gap-2 rounded-xl border border-foreground/10 bg-foreground/4 p-4
        sm:grid-cols-[8rem_minmax(0,1fr)]
      "
      >
        <p className="font-semibold text-foreground">R / Escape</p>
        <p>Reset the timer.</p>
      </div>
      <div
        className="
        grid gap-2 rounded-xl border border-foreground/10 bg-foreground/4 p-4
        sm:grid-cols-[8rem_minmax(0,1fr)]
      "
      >
        <p className="font-semibold text-foreground">P</p>
        <p>Start or pause the timer.</p>
      </div>
      <div
        className="
        grid gap-2 rounded-xl border border-foreground/10 bg-foreground/4 p-4
        sm:grid-cols-[8rem_minmax(0,1fr)]
      "
      >
        <p className="font-semibold text-foreground">Enter / Space</p>
        <p>Start or pause the timer, and reset when time has run out.</p>
      </div>
    </div>
  )
}
