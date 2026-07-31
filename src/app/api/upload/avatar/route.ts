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
  const file = formData.get("file") as File | null

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "请选择头像" }, { status: 400 })
  }

  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({ error: "头像文件不能超过 5MB" }, { status: 400 })
  }

  const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  const userId = session.user.id as string

  const ext = file.name.split(".").pop() ?? "jpg"
  const filename = `avatar-${userId}-${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const filePath = join(process.cwd(), "public", "uploads", "avatars", filename)
  await writeFile(filePath, buffer)

  await prisma.user.update({
    where: { id: userId },
    data: { avatar: `/uploads/avatars/${filename}` },
  })

  await prisma.$disconnect()

  return NextResponse.json({ success: true, avatar: `/uploads/avatars/${filename}` })
}
