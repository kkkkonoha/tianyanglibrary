import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { PrismaClient } from "@/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const body = await req.json()
  const resourceId = body?.resourceId as string | undefined
  const orderedIds = body?.orderedIds as string[] | undefined

  if (!resourceId || !Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 })
  }

  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  const resource = await prisma.resource.findUnique({ where: { id: resourceId } })
  if (!resource || resource.uploaderId !== (session.user as { id: string }).id) {
    await prisma.$disconnect()
    return NextResponse.json({ error: "无权操作" }, { status: 403 })
  }

  const existing = await prisma.resourceFile.findMany({ where: { resourceId }, select: { id: true } })
  const existingIds = new Set(existing.map((f) => f.id))
  const ordered = orderedIds.filter((id) => existingIds.has(id))
  if (ordered.length !== existing.length) {
    await prisma.$disconnect()
    return NextResponse.json({ error: "文件列表不完整" }, { status: 400 })
  }

  await prisma.$transaction(
    ordered.map((id, index) =>
      prisma.resourceFile.update({ where: { id }, data: { order: index } })
    )
  )

  await prisma.$disconnect()

  return NextResponse.json({ success: true })
}
