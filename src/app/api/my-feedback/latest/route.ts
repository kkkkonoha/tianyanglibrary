import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 当前用户最新一条反馈（用于提交后确认服务器是否收到）
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const latest = await prisma.feedback.findFirst({
    where: { userId: session.user.id as string },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, content: true, createdAt: true },
  })

  return NextResponse.json({ latest })
}
