import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getManga, fetchMangaChapters, getChapterPages } from "@/lib/suwayomi"
import { ComicReader } from "./comic-reader"

export const dynamic = "force-dynamic"

export default async function ComicReadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ chapter?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  const { chapter } = await searchParams
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
        chapters={chapters.map((c) => ({ id: String(c.id), name: c.name }))}
        activeIndex={activeIndex}
        pages={pages.map((p) => ({ index: p.index, url: `/api/suwayomi${p.url.startsWith("/") ? p.url : "/" + p.url}` }))}
      />
    </div>
  )
}
