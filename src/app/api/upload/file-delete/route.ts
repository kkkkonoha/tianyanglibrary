import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createActivity } from "@/lib/activity"
import { unlink } from "fs/promises"
import { join } from "path"

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "请先登录" }, { status: 401 })

  const fileId = req.nextUrl.searchParams.get("id")
  if (!fileId) return NextResponse.json({ error: "缺少文件 ID" }, { status: 400 })

  const file = await prisma.resourceFile.findUnique({ where: { id: fileId }, include: { resource: { select: { uploaderId: true } } } })
  if (!file || file.resource.uploaderId !== (session.user as { id: string }).id) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 })
  }

  try { await unlink(join(process.cwd(), "public", file.fileUrl)) } catch {}

  await prisma.resourceFile.delete({ where: { id: fileId } })

  await createActivity({
    type: "UPDATE",
    userId: session.user.id as string,
    resourceId: file.resourceId,
    metadata: "删除文件",
  })

  return NextResponse.json({ success: true })
}
