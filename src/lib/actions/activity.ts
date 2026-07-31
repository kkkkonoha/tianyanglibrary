"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"

export async function deleteActivity(activityId: string) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const activity = await prisma.activity.findUnique({ where: { id: activityId } })
  if (!activity) return { error: "动态不存在" }

  if (!isAdmin(session) && activity.userId !== (session.user as { id: string }).id) {
    return { error: "无权删除此动态" }
  }

  await prisma.activity.delete({ where: { id: activityId } })
  return { success: true }
}
