import type { SessionParticipant } from "@/shared/remoteSession/types"

function formatRoleCount(role: "control" | "view", count: number) {
  if (count === 0) {
    return null
  }

  return `${count} ${role}`
}

export function getParticipantSummary({
  localClientId,
  participants,
}: {
  localClientId: string
  participants: SessionParticipant[]
}) {
  const remoteParticipants = participants.filter(
    (participant) => participant.clientId !== localClientId,
  )
  const controlCount = remoteParticipants.filter(
    (participant) => participant.canControl,
  ).length
  const viewCount = remoteParticipants.length - controlCount
  const roleSummaries = [
    formatRoleCount("control", controlCount),
    formatRoleCount("view", viewCount),
  ].filter((summary): summary is string => summary !== null)

  return roleSummaries.length === 0
    ? "You"
    : `You + ${roleSummaries.join(" + ")}`
}
