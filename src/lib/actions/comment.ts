"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createActivity } from "@/lib/activity"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"

async function notify(userId: string, type: string, content: string, link: string) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO Notification (id, userId, type, content, link, "read", createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)`,
    randomUUID(), userId, type, content, link, new Date().toISOString()
  )
}

export async function addComment(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const content = formData.get("content") as string
  const resourceIdRaw = formData.get("resourceId") as string | null
  const resourceId = resourceIdRaw ? Number(resourceIdRaw) : null
  if (resourceIdRaw && !Number.isInteger(resourceId)) return { error: "资源 ID 无效" }
  const collectionId = (formData.get("collectionId") as string) ?? null
  const parentId = (formData.get("parentId") as string) ?? null

  if (!content?.trim()) return { error: "评论不能为空" }
  if (!resourceId && !collectionId) return { error: "缺少目标" }

  const userId = session.user.id as string

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      userId,
      resourceId,
      collectionId,
      parentId,
    },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      parent: { include: { user: { select: { id: true, username: true } } } },
    },
  })

  // Reply notification
  if (parentId && comment.parent && comment.parent.userId !== userId) {
    await notify(comment.parent.userId, "REPLY",
      `${session.user.name} 回复了你的评论`,
      resourceId ? `/resource/${resourceId}` : `/collections/${collectionId}`)
  }

  // Owner notification for top-level comments (not replies, not self)
  if (!parentId) {
    if (resourceId) {
      const resource = await prisma.resource.findUnique({ where: { id: resourceId }, select: { uploaderId: true, title: true } })
      if (resource && resource.uploaderId !== userId) {
        await notify(resource.uploaderId, "COMMENT",
          `${session.user.name} 评论了《${resource.title}》`,
          `/resource/${resourceId}`)
      }
    }
    if (collectionId) {
      const collection = await prisma.collection.findUnique({ where: { id: collectionId }, select: { creatorId: true, title: true } })
      if (collection && collection.creatorId !== userId) {
        await notify(collection.creatorId, "COMMENT",
          `${session.user.name} 评论了目录《${collection.title}》`,
          `/collections/${collectionId}`)
      }
    }
  }

  // Only show top-level comments in activity timeline, not replies
  if (!parentId) {
    await createActivity({
      type: "COMMENT",
      userId,
      resourceId: resourceId ?? undefined,
      collectionId: collectionId ?? undefined,
    })
  }

  if (resourceId) revalidatePath(`/resource/${resourceId}`)
  if (collectionId) revalidatePath(`/collections/${collectionId}`)
  revalidatePath("/")

  return { success: true }
}

export async function updateComment(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const commentId = formData.get("commentId") as string
  const content = formData.get("content") as string

  if (!content?.trim()) return { error: "评论不能为空" }

  const comment = await prisma.comment.findUnique({ where: { id: commentId } })
  if (!comment) return { error: "评论不存在" }
  if (comment.userId !== (session.user.id as string)) return { error: "无权编辑" }

  await prisma.comment.update({
    where: { id: commentId },
    data: { content: content.trim() },
  })

  if (comment.resourceId) revalidatePath(`/resource/${comment.resourceId}`)
  if (comment.collectionId) revalidatePath(`/collections/${comment.collectionId}`)

  return { success: true }
}

export async function deleteComment(commentId: string) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const comment = await prisma.comment.findUnique({ where: { id: commentId } })
  if (!comment) return { error: "评论不存在" }
  if (comment.userId !== (session.user.id as string)) return { error: "无权删除" }

  await prisma.comment.delete({ where: { id: commentId } })

  if (comment.resourceId) revalidatePath(`/resource/${comment.resourceId}`)
  if (comment.collectionId) revalidatePath(`/collections/${comment.collectionId}`)

  return { success: true }
}
