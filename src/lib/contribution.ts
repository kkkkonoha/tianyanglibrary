"use server"

import { prisma } from "@/lib/db"
import { CONTRIBUTION_POINTS, type ContributionAction } from "@/lib/contribution-constants"

export async function recordContribution({
  userId,
  action,
  sourceType,
  sourceId,
  points,
}: {
  userId: string
  action: ContributionAction
  sourceType?: string
  sourceId?: string | number
  points?: number
}) {
  return prisma.contributionEntry.create({
    data: {
      userId,
      action,
      points: points ?? CONTRIBUTION_POINTS[action],
      sourceType,
      sourceId: sourceId === undefined ? undefined : String(sourceId),
    },
  })
}
