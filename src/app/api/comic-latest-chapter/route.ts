import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { fetchMangaChapters } from "@/lib/suwayomi"

// 最新章节名缓存（10 分钟）：书架重复访问不打 Suwayomi
const cache = new Map<string, { name: string; ts: number }>()
const TTL = 10 * 60 * 1000

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const mangaId = req.nextUrl.searchParams.get("mangaId")
  if (!mangaId) {
    return NextResponse.json({ error: "缺少 mangaId" }, { status: 400 })
  }

  const cached = cache.get(mangaId)
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json({ latestChapter: cached.name })
  }

  try {
    const chapters = await fetchMangaChapters(mangaId)
    const latest = chapters.length > 0 ? chapters[chapters.length - 1].name : null
    if (latest) cache.set(mangaId, { name: latest, ts: Date.now() })
    return NextResponse.json({ latestChapter: latest })
  } catch {
    return NextResponse.json({ latestChapter: null }, { status: 200 })
  }
}
