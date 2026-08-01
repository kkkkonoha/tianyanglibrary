"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 删除入库的漫画条目
export async function deleteComicResource(resourceId: string) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const resource = await prisma.resource.findUnique({ where: { id: resourceId } })
  if (!resource) return { error: "资源不存在" }
  if (resource.comicMangaId && resource.uploaderId !== (session.user as { id: string }).id) {
    return { error: "无权操作" }
  }

  await prisma.resource.delete({ where: { id: resourceId } })
  return { success: true }
}
