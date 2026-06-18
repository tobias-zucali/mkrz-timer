import classNames from "classnames"
import { HTMLAttributes } from "react"
import { useTranslations } from "next-intl"

export default function HelpText({
  className,
  ...otherProps
}: HTMLAttributes<HTMLDivElement>) {
  const t = useTranslations("HelpText")
  const entries = [
    {
      description: t("toggleDescription"),
      shortcut: t("toggleShortcut"),
    },
    {
      description: t("pauseDescription"),
      shortcut: t("pauseShortcut"),
    },
    {
      description: t("resetDescription"),
      shortcut: t("resetShortcut"),
    },
    {
      description: t("navigateDescription"),
      shortcut: t("navigateShortcut"),
    },
    {
      description: t("adjustDescription"),
      shortcut: t("adjustShortcut"),
    },
  ]

  return (
    <div
      className={classNames("grid gap-3 text-sm text-ink/78", className)}
      {...otherProps}
    >
      {entries.map((entry) => (
        <div
          className="
            grid gap-2 rounded-xl border border-ink/10 bg-ink/4
            p-4 sm:grid-cols-[8rem_minmax(0,1fr)]
          "
          key={entry.shortcut}
        >
          <p className="font-semibold text-ink">{entry.shortcut}</p>
          <p>{entry.description}</p>
        </div>
      ))}
    </div>
  )
}
