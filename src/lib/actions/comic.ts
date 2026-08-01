"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ensureComicResource } from "@/lib/comic-import"
import { createActivity } from "@/lib/activity"
import { isAdmin } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

const comicImportSchema = z.object({
  mangaId: z.string().regex(/^\d+$/),
  sourceId: z.string().min(1),
})

// 手动入库：由用户点击「入库」按钮触发，创建本地条目并生成 UPLOAD 动态。
export async function importComicResource(mangaId: string, sourceId: string) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const validated = comicImportSchema.safeParse({ mangaId, sourceId })
  if (!validated.success) return { error: "参数错误" }

  const result = await ensureComicResource(mangaId, sourceId, session.user.id as string)
  if (result.error) return { error: result.error }

  if (!result.alreadyExisted) {
    await createActivity({
      type: "UPLOAD",
      userId: session.user.id as string,
      resourceId: result.resourceId,
    })
  }

  revalidatePath("/")
  revalidatePath(`/comics/${mangaId}`)
  redirect(`/resource/${result.resourceId}`)
}

// 手动合并：把 sourceResourceId 条目合并进 targetResourceId 条目。
// 要求当前用户是两个条目的作者或管理员；转移源绑定/评论/推荐/目录收藏/动态后删除源条目。
export async function mergeComicResources(targetResourceId: string | number, sourceResourceId: string | number) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const targetId = Number(targetResourceId)
  const sourceId = Number(sourceResourceId)
  if (!Number.isInteger(targetId) || !Number.isInteger(sourceId)) return { error: "条目 ID 无效" }

  const target = await prisma.resource.findUnique({ where: { id: targetId } })
  const source = await prisma.resource.findUnique({ where: { id: sourceId } })
  if (!target || !source) return { error: "条目不存在" }
  if (target.type !== "COMIC" || source.type !== "COMIC") return { error: "只能合并漫画条目" }
  if (target.id === source.id) return { error: "不能合并到自身" }

  const uid = session.user.id as string
  const canManageTarget = isAdmin(session) || target.uploaderId === uid
  const canManageSource = isAdmin(session) || source.uploaderId === uid
  if (!canManageTarget || !canManageSource) {
    return { error: "无权合并：需要是两个条目的作者或管理员" }
  }

  // 1. 转移源绑定
  const bindings = await prisma.comicBinding.findMany({ where: { resourceId: source.id } })
  for (const b of bindings) {
    await prisma.comicBinding.upsert({
      where: { sourceId_mangaId: { sourceId: b.sourceId, mangaId: b.mangaId } },
      create: { resourceId: target.id, sourceId: b.sourceId, mangaId: b.mangaId },
      update: {},
    })
  }

  // 2. 转移动态（合并后动态归属目标条目）
  await prisma.activity.updateMany({
    where: { resourceId: source.id },
    data: { resourceId: target.id },
  })

  // 3. 转移评论
  await prisma.comment.updateMany({
    where: { resourceId: source.id },
    data: { resourceId: target.id },
  })

  // 4. 转移推荐（处理 userId+resourceId 唯一约束）
  const recommendations = await prisma.recommendation.findMany({ where: { resourceId: source.id } })
  for (const r of recommendations) {
    await prisma.recommendation.upsert({
      where: { userId_resourceId: { userId: r.userId, resourceId: target.id } },
      create: { userId: r.userId, resourceId: target.id, note: r.note, createdAt: r.createdAt },
      update: {},
    })
  }

  // 5. 转移目录收藏（处理 collectionId+resourceId 唯一约束）
  const collectionResources = await prisma.collectionResource.findMany({ where: { resourceId: source.id } })
  for (const cr of collectionResources) {
    await prisma.collectionResource.upsert({
      where: { collectionId_resourceId: { collectionId: cr.collectionId, resourceId: target.id } },
      create: { collectionId: cr.collectionId, resourceId: target.id, note: cr.note, addedAt: cr.addedAt },
      update: {},
    })
  }

  // 6. 删除源条目（绑定/动态已转移，其余关联级联删除）
  await prisma.resource.delete({ where: { id: source.id } })

  await createActivity({
    type: "UPLOAD",
    userId: uid,
    resourceId: target.id,
    metadata: `手动合并了条目「${source.title}」`,
  })

  revalidatePath("/")
  revalidatePath(`/resource/${target.id}`)
  revalidatePath(`/comics`)
  return { success: true, targetId: target.id }
}
