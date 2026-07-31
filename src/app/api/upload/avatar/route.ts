import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { writeFile, unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import sharp from "sharp"

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

  const userId = session.user.id as string

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  let output: Buffer = buffer
  try {
    output = await sharp(buffer)
      .rotate()
      .resize(256, 256, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer()
  } catch {
    // not a decodable image, save as-is
  }

  const filename = `avatar-${userId}-${Date.now()}.webp`
  const filePath = join(process.cwd(), "public", "uploads", "avatars", filename)
  await writeFile(filePath, output)

  const user = await prisma.user.findUnique({ where: { id: userId } })
  await prisma.user.update({
    where: { id: userId },
    data: { avatar: `/uploads/avatars/${filename}` },
  })

  if (user?.avatar?.startsWith("/uploads/avatars/")) {
    const oldPath = join(process.cwd(), "public", user.avatar)
    if (existsSync(oldPath)) unlink(oldPath).catch(() => {})
  }

  return NextResponse.json({ success: true, avatar: `/uploads/avatars/${filename}` })
}
