"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createActivity } from "@/lib/activity"
import { revalidatePath } from "next/cache"

// 收藏/取消收藏资源（书架）
export async function toggleFavoriteResource(resourceId: string | number) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const rid = Number(resourceId)
  if (!Number.isInteger(rid)) return { error: "资源 ID 无效" }

  const userId = session.user.id as string

  const existing = await prisma.favoriteResource.findUnique({
    where: { userId_resourceId: { userId, resourceId: rid } },
  })

  if (existing) {
    await prisma.favoriteResource.delete({ where: { id: existing.id } })
    // 取消收藏时移除对应动态
    await prisma.activity.deleteMany({
      where: { userId, type: "FAVORITE", resourceId: rid },
    })
    revalidatePath("/")
    revalidatePath(`/resource/${rid}`)
    revalidatePath(`/favorites`)
    return { success: true, favorited: false }
  }

  await prisma.favoriteResource.create({
    data: { userId, resourceId: rid },
  })

  await createActivity({
    type: "FAVORITE",
    userId,
    resourceId: rid,
  })

  revalidatePath("/")
  revalidatePath(`/resource/${rid}`)
  revalidatePath(`/favorites`)
  return { success: true, favorited: true }
}
