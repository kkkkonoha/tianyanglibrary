import { prisma } from "@/lib/db"
import { getManga } from "@/lib/suwayomi"

// 查找或自动创建本地 Resource（入库）。
// 注意：这是普通函数，在页面渲染中直接调用，不得使用 revalidatePath 或 server action 语义。
export async function ensureComicResource(mangaId: string, sourceId: string, userId: string) {
  // 1. 精确查重：(sourceId, mangaId)
  const exact = await prisma.resource.findFirst({
    where: { comicSourceId: sourceId, comicMangaId: mangaId },
  })
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
    const sameTitle = await prisma.resource.findFirst({
      where: { type: "COMIC", title },
      orderBy: { createdAt: "asc" },
    })
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
