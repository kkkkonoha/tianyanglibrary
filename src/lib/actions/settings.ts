"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const bio = (formData.get("bio") as string)?.trim() ?? ""

  await prisma.user.update({
    where: { id: session.user.id as string },
    data: { bio: bio || null },
  })

  revalidatePath("/settings")
  revalidatePath(`/profile/${session.user.name}`)
  return { success: true }
}

export async function changePassword(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const currentPassword = formData.get("currentPassword") as string
  const newPassword = formData.get("newPassword") as string
  const confirmPassword = formData.get("confirmPassword") as string

  if (!currentPassword || !newPassword) return { error: "请填写所有字段" }
  if (newPassword.length < 6) return { error: "新密码至少6个字符" }
  if (newPassword !== confirmPassword) return { error: "两次密码不一致" }

  const user = await prisma.user.findUnique({ where: { id: session.user.id as string } })
  if (!user) return { error: "用户不存在" }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!isValid) return { error: "当前密码错误" }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: session.user.id as string },
    data: { passwordHash },
  })

  return { success: true, message: "密码修改成功" }
}
