"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createActivity } from "@/lib/activity"
import { revalidatePath } from "next/cache"

export async function addComment(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const content = formData.get("content") as string
  const resourceId = (formData.get("resourceId") as string) ?? null
  const collectionId = (formData.get("collectionId") as string) ?? null

  if (!content?.trim()) return { error: "评论不能为空" }
  if (!resourceId && !collectionId) return { error: "缺少目标" }

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      userId: session.user.id as string,
      resourceId,
      collectionId,
    },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
    },
  })

  await createActivity({
    type: "COMMENT",
    userId: session.user.id as string,
    resourceId: resourceId ?? undefined,
    collectionId: collectionId ?? undefined,
  })

  if (resourceId) revalidatePath(`/resource/${resourceId}`)
  if (collectionId) revalidatePath(`/collections/${collectionId}`)
  revalidatePath("/")

  return { success: true }
}
