import { prisma } from "@/lib/db"
import { getManga } from "@/lib/suwayomi"

// 查找已入库的本地 Resource（只查不建）。
// 优先按 (sourceId, mangaId) binding 精确匹配，失败时按标题去重匹配。
export async function findComicResource(mangaId: string, sourceId: string, title?: string) {
  const binding = await prisma.comicBinding.findUnique({
    where: { sourceId_mangaId: { sourceId, mangaId } },
  })
  if (binding) {
    const resource = await prisma.resource.findUnique({ where: { id: binding.resourceId } })
    if (resource) return resource
  }

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
  // 1. 精确查重：(sourceId, mangaId) binding
  const existing = await findComicResource(mangaId, sourceId)
  if (existing) return { resourceId: existing.id, alreadyExisted: true }

  // 2. 从 Suwayomi 拉取详情
  let manga: any
  try {
    manga = await getManga(mangaId)
  } catch {
    return { error: "获取漫画信息失败" }
  }

  // 3. 按标题去重：同名跨源合并为同一条目，并把当前源挂载为 binding（源不丢弃）
  const title = manga.title?.trim()
  if (title) {
    const sameTitle = await findComicResource(mangaId, sourceId, title)
    if (sameTitle) {
      await prisma.comicBinding.upsert({
        where: { sourceId_mangaId: { sourceId, mangaId } },
        create: { resourceId: sameTitle.id, sourceId, mangaId },
        update: {},
      })
      return { resourceId: sameTitle.id, alreadyExisted: true }
    }
  }

  // 4. 创建新条目 + 主 binding
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
  await prisma.comicBinding.create({
    data: { resourceId: resource.id, sourceId, mangaId },
  })

  return { resourceId: resource.id, alreadyExisted: false }
}

// 查询条目下所有已绑定的源
export async function getComicBindings(resourceId: string) {
  return prisma.comicBinding.findMany({
    where: { resourceId },
    orderBy: { createdAt: "asc" },
  })
}
