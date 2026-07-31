import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { writeFile } from "fs/promises"
import { join } from "path"
import { PrismaClient } from "@/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { revalidatePath } from "next/cache"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const formData = await req.formData()
  const resourceId = formData.get("resourceId") as string
  const file = formData.get("file") as File | null

  if (!resourceId) {
    return NextResponse.json({ error: "缺少资源 ID" }, { status: 400 })
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "请选择文件" }, { status: 400 })
  }

  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({ error: "封面文件不能超过 10MB" }, { status: 400 })
  }

  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  const resource = await prisma.resource.findUnique({ where: { id: resourceId } })
  if (!resource || resource.uploaderId !== (session.user as { id: string }).id) {
    await prisma.$disconnect()
    return NextResponse.json({ error: "无权操作" }, { status: 403 })
  }

  const ext = file.name.split(".").pop() ?? "jpg"
  const filename = `cover-${resourceId}-${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const filePath = join(process.cwd(), "public", "uploads", "covers", filename)
  await writeFile(filePath, buffer)

  await prisma.resource.update({
    where: { id: resourceId },
    data: { coverImage: `/uploads/covers/${filename}` },
  })

  await prisma.$disconnect()

  return NextResponse.json({ success: true, coverImage: `/uploads/covers/${filename}` })
}
