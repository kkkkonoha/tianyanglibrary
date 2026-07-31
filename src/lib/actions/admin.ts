"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isSuperAdmin } from "@/lib/permissions"
import { revalidatePath } from "next/cache"

export async function setUserRole(userId: string, role: string) {
  const session = await auth()
  if (!isSuperAdmin(session)) return { error: "仅超级管理员可操作" }

  if (!["admin", "user"].includes(role)) return { error: "无效的角色" }

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  })

  revalidatePath("/admin")
  return { success: true }
}

export async function approveUser(userId: string) {
  const session = await auth()
  if (!isSuperAdmin(session)) return { error: "仅超级管理员可操作" }

  await prisma.user.update({
    where: { id: userId },
    data: { status: "active" },
  })

  revalidatePath("/admin")
  return { success: true }
}

export async function rejectUser(userId: string) {
  const session = await auth()
  if (!isSuperAdmin(session)) return { error: "仅超级管理员可操作" }

  await prisma.user.update({
    where: { id: userId },
    data: { status: "rejected" },
  })

  revalidatePath("/admin")
  return { success: true }
}
