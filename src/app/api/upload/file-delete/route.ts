import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { unlink } from "fs/promises"
import { join } from "path"
import { PrismaClient } from "@/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "请先登录" }, { status: 401 })

  const fileId = req.nextUrl.searchParams.get("id")
  if (!fileId) return NextResponse.json({ error: "缺少文件 ID" }, { status: 400 })

  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  const file = await prisma.resourceFile.findUnique({ where: { id: fileId }, include: { resource: { select: { uploaderId: true } } } })
  if (!file || file.resource.uploaderId !== (session.user as { id: string }).id) {
    await prisma.$disconnect()
    return NextResponse.json({ error: "无权操作" }, { status: 403 })
  }

  try { await unlink(join(process.cwd(), "public", file.fileUrl)) } catch {}

  await prisma.resourceFile.delete({ where: { id: fileId } })
  await prisma.$disconnect()

  return NextResponse.json({ success: true })
}
