import { prisma } from "@/lib/db"
import { getManga } from "@/lib/suwayomi"

// 查找已入库的本地 Resource（只查不建）。按 (sourceId, mangaId) 精确匹配，或按标题去重匹配。
export async function findComicResource(mangaId: string, sourceId: string, title?: string) {
  const exact = await prisma.resource.findFirst({
    where: { comicSourceId: sourceId, comicMangaId: mangaId },
  })
  if (exact) return exact

  if (title?.trim()) {
    const sameTitle = await prisma.resource.findFirst({
      where: { type: "COMIC", title: title.trim() },
      orderBy: { createdAt: "asc" },
    })
    if (sameTitle) return sameTitle
  }
  return null
}

// 查找或创建本地 Resource（入库）。仅供 server action 调用，不得在页面渲染中直接调用。
export async function ensureComicResource(mangaId: string, sourceId: string, userId: string) {
  // 1. 精确查重：(sourceId, mangaId)
  const exact = await findComicResource(mangaId, sourceId)
  if (exact) return { resourceId: exact.id, alreadyExisted: true }

  // 2. 从 Suwayomi 拉取详情
  let manga: any
  try {
    manga = await getManga(mangaId)
  } catch {
    return { error: "获取漫画信息失败" }
  }

  // 3. 按标题去重：同一标题的漫画条目直接复用，避免跨源重复条目
  const title = manga.title?.trim()
  if (title) {
    const sameTitle = await findComicResource(mangaId, sourceId, title)
    if (sameTitle) return { resourceId: sameTitle.id, alreadyExisted: true }
  }

  // 4. 创建新条目
  const resource = await prisma.resource.create({
    data: {
      title: title || "未命名漫画",
      author: manga.author ?? null,
      description: manga.description ?? null,
      coverImage: manga.thumbnailUrl ? `/api/suwayomi${manga.thumbnailUrl}` : null,
      type: "COMIC",
      comicSourceId: sourceId,
      comicMangaId: mangaId,
      uploaderId: userId,
    },
  })

  return { resourceId: resource.id, alreadyExisted: false }
}
