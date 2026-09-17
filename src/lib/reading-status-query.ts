import { prisma } from "@/lib/db"

export const READING_STATUS_OPTIONS = [
  { value: "WANT", label: "想读" },
  { value: "READING", label: "在读" },
  { value: "READ", label: "读过" },
  { value: "DROPPED", label: "抛弃" },
] as const

export async function getCurrentReadingStatus(userId: string | undefined, resourceId: number) {
  if (!userId) return null
  return prisma.readingStatusEntry.findUnique({
    where: { userId_resourceId: { userId, resourceId } },
    select: { status: true, note: true },
  })
}

export async function getResourceStatusReviews(resourceId: number) {
  return prisma.readingStatusEntry.findMany({
    where: { resourceId, note: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      note: true,
      updatedAt: true,
      user: { select: { id: true, username: true, avatar: true } },
    },
  })
}
