import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET /api/comic-progress?mangaId=xxx — 获取当前用户的阅读进度
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const mangaId = req.nextUrl.searchParams.get("mangaId")
  if (!mangaId) {
    return NextResponse.json({ error: "缺少 mangaId" }, { status: 400 })
  }

  const history = await prisma.readingHistory.findUnique({
    where: {
      userId_mangaId: {
        userId: session.user.id as string,
        mangaId,
      },
    },
  })

  return NextResponse.json({ history })
}

// POST /api/comic-progress — 保存阅读进度
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const body = await req.json()
  const mangaId = body?.mangaId as string | undefined
  const mangaTitle = body?.mangaTitle as string | undefined
  const chapterId = body?.chapterId as string | undefined
  const chapterName = body?.chapterName as string | undefined
  const pageIndex = body?.pageIndex as number | undefined
  const totalPages = body?.totalPages as number | undefined

  if (!mangaId || !chapterId || typeof pageIndex !== "number") {
    return NextResponse.json({ error: "参数错误" }, { status: 400 })
  }

  await prisma.readingHistory.upsert({
    where: {
      userId_mangaId: {
        userId: session.user.id as string,
        mangaId,
      },
    },
    update: {
      mangaTitle: mangaTitle ?? undefined,
      chapterId,
      chapterName: chapterName ?? undefined,
      pageIndex,
      totalPages: totalPages ?? undefined,
    },
    create: {
      userId: session.user.id as string,
      mangaId,
      mangaTitle: mangaTitle ?? "",
      chapterId,
      chapterName: chapterName ?? "",
      pageIndex,
      totalPages: totalPages ?? 0,
    },
  })

  return NextResponse.json({ success: true })
}
