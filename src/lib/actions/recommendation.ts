"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createActivity } from "@/lib/activity"
import { revalidatePath } from "next/cache"

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
    await prisma.recommendation.delete({
      where: { id: existing.id },
    })
    revalidatePath(`/resource/${resourceId}`)
    return { success: true, recommended: false }
  }

  await prisma.recommendation.create({
    data: { userId, resourceId, note },
  })

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
