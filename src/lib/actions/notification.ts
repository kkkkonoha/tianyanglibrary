"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function markAllNotificationsRead() {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  await prisma.$executeRawUnsafe(
    `UPDATE Notification SET "read" = 1 WHERE userId = ? AND "read" = 0`,
    session.user.id as string
  )

  revalidatePath("/")
  revalidatePath("/notifications")
  return { success: true }
}

export async function markOneNotificationRead(notifId: string) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  await prisma.$executeRawUnsafe(
    `UPDATE Notification SET "read" = 1 WHERE id = ? AND userId = ?`,
    notifId, session.user.id as string
  )

  revalidatePath("/notifications")
  return { success: true }
}
