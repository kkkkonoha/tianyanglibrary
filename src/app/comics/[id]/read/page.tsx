import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getManga, fetchMangaChapters, getChapterPages, getSourceName } from "@/lib/suwayomi"
import { findComicResource, getComicBindings } from "@/lib/comic-import"
import { ComicReader } from "./comic-reader"

export const dynamic = "force-dynamic"

export default async function ComicReadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ chapter?: string; end?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const { chapter, end } = await searchParams
  if (!/^\d+$/.test(id)) notFound()

  let manga: any
  let chapters: any[]
  try {
    manga = await getManga(id)
    chapters = await fetchMangaChapters(id)
  } catch {
    notFound()
  }

  if (chapters.length === 0) notFound()

  // 条目绑定的所有源（跨源同名合并），用于阅读器内切换
  let sources: Array<{ mangaId: string; name: string }> = []
  try {
    const sourceId = manga.sourceId ?? ""
    const resource = await findComicResource(id, sourceId, manga.title)
    if (resource) {
      const bindings = await getComicBindings(resource.id)
      sources = bindings.map((b) => ({ mangaId: b.mangaId, name: getSourceName(b.sourceId) }))
    }
  } catch {
    // 源列表获取失败不影响阅读
  }

  // Determine current chapter
  let currentChapterId = chapter
  if (!currentChapterId) {
    currentChapterId = chapters[0].id
  }
  const currentIndex = chapters.findIndex((c) => String(c.id) === String(currentChapterId))
  const activeChapter = currentIndex >= 0 ? chapters[currentIndex] : chapters[0]
  const activeIndex = currentIndex >= 0 ? currentIndex : 0

  // Fetch pages for the active chapter
  let pages: Array<{ url: string; index: number }> = []
  try {
    pages = await getChapterPages(String(activeChapter.id))
  } catch {
    // pages fetch may fail (requires login to source), show error state
  }

  return (
    <div className="min-h-screen bg-black">
      <ComicReader
        mangaId={id}
        mangaTitle={manga.title}
        sources={sources}
        chapters={chapters.map((c) => ({ id: String(c.id), name: c.name }))}
        activeIndex={activeIndex}
        startFromEnd={end === "1"}
        pages={pages.map((p) => ({ index: p.index, url: `/api/suwayomi${p.url.startsWith("/") ? p.url : "/" + p.url}` }))}
      />
    </div>
  )
}
