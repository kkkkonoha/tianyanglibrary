"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { isSuperAdmin } from "@/lib/permissions"
import { randomBytes } from "crypto"
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

// 管理员重置用户密码：生成 10 位随机密码，返回明文一次性展示
export async function resetUserPassword(userId: string) {
  const session = await auth()
  if (!isSuperAdmin(session)) return { error: "无权操作" }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { error: "用户不存在" }
  if (user.role === "super_admin") return { error: "不能重置超级管理员的密码" }

  // 10 位随机密码：大小写字母 + 数字 + 符号
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%"
  const password = Array.from(randomBytes(10), (b) => chars[b % chars.length]).join("")

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  })

  revalidatePath("/admin")
  return { success: true, password, username: user.username }
}
