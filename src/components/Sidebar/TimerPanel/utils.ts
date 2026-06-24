import { useTranslations } from "next-intl"

import type { SyncParams } from "@/shared/liveSession/types"
import { buildDurationPartsFromTotalSeconds } from "@/shared/timerSequence"

type SequenceRow = SyncParams["rows"][number]

export const stateBadgeClassName =
  "rounded-full px-2.5 py-1 font-display text-[0.68rem] font-semibold tracking-[0.05em]"

export const buildSummaryText = (
  row: SequenceRow,
  t: ReturnType<typeof useTranslations>,
) => {
  const duration = buildDurationPartsFromTotalSeconds(row.totalSeconds)
  const parts = [`${duration.m}:${duration.s}`]

  if (row.repeatCount > 1) {
    parts.push(t("repeatSummary", { count: row.repeatCount }))
  }

  if (row.endBehavior === "advance") {
    parts.push(t("autoAdvance"))
  }

  return parts.join(" • ")
}

export const getCardAccentStyle = ({
  isSelected,
  primaryColor,
}: {
  isSelected: boolean
  primaryColor: string
}) => ({
  borderColor: `${primaryColor}${isSelected ? "cc" : "36"}`,
  boxShadow: `inset 0 0 0 1px ${
    isSelected ? `${primaryColor}3d` : "transparent"
  }`,
})
