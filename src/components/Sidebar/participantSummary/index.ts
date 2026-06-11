import type { SessionParticipant } from "@/shared/liveSession/types"
import type { AppTranslationFn } from "@/i18n/translator"

function formatRoleCount(
  role: "control" | "view",
  count: number,
  t: AppTranslationFn,
) {
  if (count === 0) {
    return null
  }

  return t(role, { count })
}

export function getParticipantSummary({
  localClientId,
  participants,
  t,
}: {
  localClientId: string
  participants: SessionParticipant[]
  t: AppTranslationFn
}) {
  const remoteParticipants = participants.filter(
    (participant) => participant.clientId !== localClientId,
  )
  const controlCount = remoteParticipants.filter(
    (participant) => participant.canControl,
  ).length
  const viewCount = remoteParticipants.length - controlCount
  const roleSummaries = [
    formatRoleCount("control", controlCount, t),
    formatRoleCount("view", viewCount, t),
  ].filter((summary): summary is string => summary !== null)

  return roleSummaries.length === 0
    ? t("you")
    : t("youWithOthers", {
        roles: roleSummaries.join(" + "),
      })
}
