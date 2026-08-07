"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createActivity } from "@/lib/activity"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const collectionSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(100),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().default(true),
})

export async function createCollection(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const validated = collectionSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    isPublic: formData.get("isPublic") !== "false",
  })

  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const collection = await prisma.collection.create({
    data: {
      ...validated.data,
      creatorId: session.user.id as string,
    },
  })

  await createActivity({
    type: "CREATE_COLLECTION",
    userId: session.user.id as string,
    collectionId: collection.id,
  })

  revalidatePath("/")
  revalidatePath("/collections")
  return { success: true, id: collection.id }
}

export async function addToCollection(collectionId: string, resourceId: string | number) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }
  const rid = Number(resourceId)
  if (!Number.isInteger(rid)) return { error: "资源 ID 无效" }

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  })

  if (!collection) return { error: "目录不存在" }
  if (collection.creatorId !== (session.user.id as string)) {
    return { error: "无权操作" }
  }

  const existing = await prisma.collectionResource.findUnique({
    where: { collectionId_resourceId: { collectionId, resourceId: rid } },
  })

  if (existing) return { error: "该资源已在目录中" }

  await prisma.collectionResource.create({
    data: { collectionId, resourceId: rid },
  })

  await createActivity({
    type: "ADD_TO_COLLECTION",
    userId: session.user.id as string,
    resourceId: rid,
    collectionId,
  })

  revalidatePath("/")
  revalidatePath(`/collections/${collectionId}`)
  return { success: true }
}

// 目录添加条目的资源搜索：q 为空返回最近更新条目（默认列表），非空按标题/作者模糊搜索
export async function searchResources(q: string) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const keyword = q?.trim() ?? ""
  const where = keyword
    ? { OR: [{ title: { contains: keyword } }, { author: { contains: keyword } }] }
    : undefined

  const resources = await prisma.resource.findMany({
    where,
    orderBy: keyword ? undefined : { updatedAt: "desc" },
    take: keyword ? 20 : 30,
    select: { id: true, title: true, author: true, coverImage: true, type: true },
  })

  return { resources }
}

// 批量添加条目到目录（过滤已在目录中的，每条独立产生 ADD_TO_COLLECTION 动态）
export async function addResourcesToCollection(collectionId: string, resourceIds: (string | number)[]) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const ids = resourceIds.map(Number).filter((n) => Number.isInteger(n))
  if (ids.length === 0) return { error: "请选择要添加的条目" }

  const collection = await prisma.collection.findUnique({ where: { id: collectionId } })
  if (!collection) return { error: "目录不存在" }
  if (collection.creatorId !== (session.user.id as string)) return { error: "无权操作" }

  const existing = await prisma.collectionResource.findMany({
    where: { collectionId, resourceId: { in: ids } },
    select: { resourceId: true },
  })
  const existingSet = new Set(existing.map((e) => e.resourceId))
  const toAdd = ids.filter((id) => !existingSet.has(id))

  for (const rid of toAdd) {
    await prisma.collectionResource.create({
      data: { collectionId, resourceId: rid },
    })
    await createActivity({
      type: "ADD_TO_COLLECTION",
      userId: session.user.id as string,
      resourceId: rid,
      collectionId,
    })
  }

  revalidatePath("/")
  revalidatePath(`/collections/${collectionId}`)
  return { success: true, added: toAdd.length, skipped: ids.length - toAdd.length }
}

export async function toggleFavoriteCollection(collectionId: string) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const userId = session.user.id as string

  const existing = await prisma.favoriteCollection.findUnique({
    where: { userId_collectionId: { userId, collectionId } },
  })

  if (existing) {
    await prisma.favoriteCollection.delete({
      where: { id: existing.id },
    })
    revalidatePath(`/collections/${collectionId}`)
    return { success: true, favorited: false }
  }

  await prisma.favoriteCollection.create({
    data: { userId, collectionId },
  })

  revalidatePath(`/collections/${collectionId}`)
  return { success: true, favorited: true }
}

export async function deleteCollection(collectionId: string) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const { isAdmin } = await import("@/lib/permissions")

  const collection = await prisma.collection.findUnique({ where: { id: collectionId } })
  if (!collection) return { error: "目录不存在" }

  if (!isAdmin(session) && collection.creatorId !== (session.user.id as string)) {
    return { error: "无权操作" }
  }

  // Activity 外键无级联删除：先移除该目录的动态（创建/添加目录/目录评论等时间线记录）
  await prisma.activity.deleteMany({ where: { collectionId } })

  await prisma.collection.delete({ where: { id: collectionId } })

  revalidatePath("/collections")
  revalidatePath("/")
  return { success: true }
}

export async function updateCollection(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const id = formData.get("id") as string
  const collection = await prisma.collection.findUnique({ where: { id } })
  if (!collection) return { error: "目录不存在" }
  if (collection.creatorId !== (session.user.id as string)) return { error: "无权操作" }

  const validated = collectionSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  })

  if (!validated.success) return { error: validated.error.issues[0].message }

  await prisma.collection.update({
    where: { id },
    data: { title: validated.data.title, description: validated.data.description ?? null },
  })

  revalidatePath(`/collections/${id}`)
  revalidatePath("/collections")
  return { success: true }
}

export async function removeFromCollection(collectionId: string, resourceId: string | number) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }
  const rid = Number(resourceId)
  if (!Number.isInteger(rid)) return { error: "资源 ID 无效" }

  const collection = await prisma.collection.findUnique({ where: { id: collectionId } })
  if (!collection) return { error: "目录不存在" }
  if (collection.creatorId !== (session.user.id as string)) return { error: "无权操作" }

  await prisma.collectionResource.delete({
    where: { collectionId_resourceId: { collectionId, resourceId: rid } },
  })

  revalidatePath(`/collections/${collectionId}`)
  return { success: true }
}

export async function setCollectionResourceNote(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const collectionResourceId = formData.get("crId") as string
  const note = (formData.get("note") as string)?.trim() || null

  const cr = await prisma.collectionResource.findUnique({
    where: { id: collectionResourceId },
    include: { collection: { select: { creatorId: true } } },
  })
  if (!cr) return { error: "记录不存在" }
  if (cr.collection.creatorId !== (session.user.id as string)) return { error: "无权操作" }

  await prisma.collectionResource.update({
    where: { id: collectionResourceId },
    data: { note },
  })

  revalidatePath(`/collections/${cr.collectionId}`)
  return { success: true }
}
