"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getManga } from "@/lib/suwayomi"
import { revalidatePath } from "next/cache"

// 查找或自动创建本地 Resource（入库）
export async function ensureComicResource(mangaId: string, sourceId: string) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  // 查重
  const existing = await prisma.resource.findFirst({
    where: { comicSourceId: sourceId, comicMangaId: mangaId },
  })
  if (existing) return { success: true, resourceId: existing.id, alreadyExisted: true }

  // 从 Suwayomi 拉取详情用于入库
  let manga: any
  try {
    manga = await getManga(mangaId)
  } catch {
    return { error: "获取漫画信息失败" }
  }

  const resource = await prisma.resource.create({
    data: {
      title: manga.title ?? "未命名漫画",
      author: manga.author ?? null,
      description: manga.description ?? null,
      coverImage: manga.thumbnailUrl ? `/api/suwayomi${manga.thumbnailUrl}` : null,
      type: "COMIC",
      comicSourceId: sourceId,
      comicMangaId: mangaId,
      uploaderId: session.user.id as string,
    },
  })

  revalidatePath("/explore")
  revalidatePath(`/comics/${mangaId}`)
  return { success: true, resourceId: resource.id, alreadyExisted: false }
}

// 删除入库的漫画条目
export async function deleteComicResource(resourceId: string) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const resource = await prisma.resource.findUnique({ where: { id: resourceId } })
  if (!resource) return { error: "资源不存在" }
  if (resource.comicMangaId && resource.uploaderId !== (session.user as { id: string }).id) {
    return { error: "无权操作" }
  }

  await prisma.resource.delete({ where: { id: resourceId } })
  return { success: true }
}
