import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getChapterPages } from "@/lib/suwayomi"

// 章节图片列表缓存（10 分钟）：阅读器预取下一章时避免重复打 Suwayomi
const cache = new Map<string, { urls: string[]; ts: number }>()
const TTL = 10 * 60 * 1000

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const chapterId = req.nextUrl.searchParams.get("chapterId")
  if (!chapterId) {
    return NextResponse.json({ error: "缺少 chapterId" }, { status: 400 })
  }

  const cached = cache.get(chapterId)
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json({ urls: cached.urls })
  }

  try {
    const pages = await getChapterPages(chapterId)
    const urls = pages.map((p) => `/api/suwayomi${p.url.startsWith("/") ? p.url : "/" + p.url}`)
    if (urls.length > 0) cache.set(chapterId, { urls, ts: Date.now() })
    return NextResponse.json({ urls })
  } catch {
    return NextResponse.json({ urls: [] }, { status: 200 })
  }
}
