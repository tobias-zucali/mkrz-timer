import classNames from "classnames"
import { HTMLAttributes } from "react"
import { useTranslations } from "next-intl"

export default function HelpText({
  className,
  ...otherProps
}: HTMLAttributes<HTMLDivElement>) {
  const t = useTranslations("HelpText")

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
        <p className="font-semibold text-foreground">{t("resetShortcut")}</p>
        <p>{t("resetDescription")}</p>
      </div>
      <div
        className="
        grid gap-2 rounded-xl border border-foreground/10 bg-foreground/4 p-4
        sm:grid-cols-[8rem_minmax(0,1fr)]
      "
      >
        <p className="font-semibold text-foreground">{t("pauseShortcut")}</p>
        <p>{t("pauseDescription")}</p>
      </div>
      <div
        className="
        grid gap-2 rounded-xl border border-foreground/10 bg-foreground/4 p-4
        sm:grid-cols-[8rem_minmax(0,1fr)]
      "
      >
        <p className="font-semibold text-foreground">{t("toggleShortcut")}</p>
        <p>{t("toggleDescription")}</p>
      </div>
    </div>
  )
}
