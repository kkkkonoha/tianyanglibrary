import { prisma } from "./db"
import type { $Enums } from "@/generated/prisma/client"

type ActivityType = $Enums.ActivityType

interface CreateActivityParams {
  type: ActivityType
  userId: string
  resourceId?: number
  collectionId?: string
  metadata?: string
}

export async function createActivity(params: CreateActivityParams) {
  return prisma.activity.create({
    data: {
      type: params.type,
      userId: params.userId,
      resourceId: params.resourceId,
      collectionId: params.collectionId,
      metadata: params.metadata,
    },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      resource: { select: { id: true, title: true, type: true } },
      collection: { select: { id: true, title: true } },
    },
  })
}
