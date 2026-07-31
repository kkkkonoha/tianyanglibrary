import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { writeFile } from "fs/promises"
import { join } from "path"
import { PrismaClient } from "@/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

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

  const maxSize = 500 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({ error: "文件大小不能超过 500MB" }, { status: 400 })
  }

  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  const resource = await prisma.resource.findUnique({ where: { id: resourceId } })
  if (!resource || resource.uploaderId !== (session.user as { id: string }).id) {
    await prisma.$disconnect()
    return NextResponse.json({ error: "无权操作" }, { status: 403 })
  }

  const ext = file.name.split(".").pop() ?? "dat"
  const storedName = `${resourceId}-${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const filePath = join(process.cwd(), "public", "uploads", "files", storedName)
  await writeFile(filePath, buffer)

  const record = await prisma.resourceFile.create({
    data: {
      resourceId,
      fileName: file.name,
      fileUrl: `/uploads/files/${storedName}`,
      fileSize: file.size,
    },
  })

  await prisma.$disconnect()

  return NextResponse.json({ success: true, file: { id: record.id, fileName: file.name, fileUrl: record.fileUrl, fileSize: file.size } })
}
