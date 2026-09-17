import { prisma } from "@/lib/db"
import { getManga } from "@/lib/suwayomi"

function normalizeDescription(value: unknown) {
  if (typeof value !== "string") return null
  const description = value.trim()
  return description || null
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((tag) => normalizeText(tag)).filter(Boolean).slice(0, 20)
}

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
export async function ensureComicResource(
  mangaId: string,
  sourceId: string,
  userId: string,
  manualDescription?: string,
  manualAuthor?: string,
  manualTags?: string,
) {
  // 1. 精确查重：(sourceId, mangaId) binding
  const existing = await findComicResource(mangaId, sourceId)
  if (existing?.description?.trim()) return { resourceId: existing.id, alreadyExisted: true }

  // 2. 从 Suwayomi 拉取详情。已有但简介为空的条目也要借此补齐简介。
  let manga: any
  try {
    manga = await getManga(mangaId)
  } catch {
    if (existing?.description?.trim()) return { resourceId: existing.id, alreadyExisted: true }
    if (existing && manualDescription?.trim()) {
      await prisma.resource.update({
        where: { id: existing.id },
        data: { description: manualDescription.trim() },
      })
      return { resourceId: existing.id, alreadyExisted: true }
    }
    if (existing) {
      return { error: "暂时无法获取漫画源简介，请填写简介后再入库", requiresDescription: true }
    }
    return { error: "获取漫画信息失败" }
  }
  const description = normalizeDescription(manga.description) ?? normalizeDescription(manualDescription)
  const author = normalizeText(manga.author) || normalizeText(manualAuthor)
  const tags = normalizeTags(manga.genre)
  const fallbackTags = (manualTags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean)
  const finalTags = tags.length > 0 ? tags : fallbackTags

  // 已按源精确匹配到的条目：只补充空简介，不覆盖已有人工简介。
  if (existing) {
    if (!description) {
      return { error: "漫画源没有提供简介，请填写简介后再入库", requiresDescription: true }
    }
    if (description) {
      await prisma.resource.update({
        where: { id: existing.id },
        data: { description },
      })
    }
    return { resourceId: existing.id, alreadyExisted: true }
  }

  // 3. 按标题去重：同名跨源合并为同一条目，并把当前源挂载为 binding（源不丢弃）
  const title = manga.title?.trim()
  if (title) {
    const sameTitle = await findComicResource(mangaId, sourceId, title)
    if (sameTitle) {
      if (!sameTitle.description?.trim() && !description) {
        return { error: "漫画源没有提供简介，请填写简介后再入库", requiresDescription: true }
      }
      await prisma.comicBinding.upsert({
        where: { sourceId_mangaId: { sourceId, mangaId } },
        create: { resourceId: sameTitle.id, sourceId, mangaId },
        update: {},
      })
      // 同名条目可能是手动创建的；一键入库时只补齐空简介。
      if (!sameTitle.description?.trim() && description) {
        await prisma.resource.update({
          where: { id: sameTitle.id },
          data: { description },
        })
      }
      return { resourceId: sameTitle.id, alreadyExisted: true }
    }
  }

  if (!description) {
    return { error: "漫画源没有提供简介，请填写简介后再入库", requiresDescription: true, requiresMetadata: !author || finalTags.length === 0 }
  }
  if (!author || finalTags.length === 0) {
    return { error: "漫画源没有提供完整作者或标签，请补充后再入库", requiresMetadata: true }
  }

  // 4. 创建新条目 + 主 binding
  const resource = await prisma.resource.create({
    data: {
      title: title || "未命名漫画",
      author,
      description,
      coverImage: manga.thumbnailUrl ? `/api/suwayomi${manga.thumbnailUrl}` : null,
      type: "COMIC",
      comicSourceId: sourceId,
      comicMangaId: mangaId,
      uploaderId: userId,
    },
  })
  for (const name of finalTags) {
    const tag = await prisma.tag.upsert({ where: { name }, create: { name }, update: {} })
    await prisma.resourceTag.create({ data: { resourceId: resource.id, tagId: tag.id } })
  }
  await prisma.comicBinding.create({
    data: { resourceId: resource.id, sourceId, mangaId },
  })

  return { resourceId: resource.id, alreadyExisted: false }
}

// 查询条目下所有已绑定的源
export async function getComicBindings(resourceId: number) {
  return prisma.comicBinding.findMany({
    where: { resourceId },
    orderBy: { createdAt: "asc" },
  })
}
