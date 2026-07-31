"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createActivity } from "@/lib/activity"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"

export async function toggleRecommendation(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const resourceId = formData.get("resourceId") as string
  const note = (formData.get("note") as string)?.trim() || undefined
  const userId = session.user.id as string

  const existing = await prisma.recommendation.findUnique({
    where: { userId_resourceId: { userId, resourceId } },
  })

  if (existing) {
    await prisma.recommendation.delete({ where: { id: existing.id } })
    revalidatePath(`/resource/${resourceId}`)
    return { success: true, recommended: false }
  }

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { uploaderId: true, title: true },
  })

  await prisma.recommendation.create({
    data: { userId, resourceId, note },
  })

  // Notify the resource owner
  if (resource && resource.uploaderId !== userId) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO Notification (id, userId, type, content, link, "read", createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)`,
      randomUUID(), resource.uploaderId, "RECOMMEND",
      `${session.user.name} 推荐了《${resource.title}》`,
      `/resource/${resourceId}`,
      new Date().toISOString()
    )
  }

  await createActivity({
    type: "RECOMMEND",
    userId,
    resourceId,
    metadata: note,
  })

  revalidatePath("/")
  revalidatePath(`/resource/${resourceId}`)
  return { success: true, recommended: true }
}
