"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const usernameSchema = z
  .string()
  .min(2, "用户名至少2个字符")
  .max(20, "用户名最多20个字符")
  .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, "用户名只能包含字母、数字、下划线和中文")

// 用户名每月只能修改一次
const USERNAME_CHANGE_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000

export async function changeUsername(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const newUsername = (formData.get("username") as string)?.trim() ?? ""
  const validated = usernameSchema.safeParse(newUsername)
  if (!validated.success) return { error: validated.error.issues[0].message }

  const userId = session.user.id as string
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { error: "用户不存在" }

  if (user.username === newUsername) return { error: "新用户名与当前用户名相同" }

  // 每月一次限制
  if (user.lastUsernameChangeAt) {
    const elapsed = Date.now() - new Date(user.lastUsernameChangeAt).getTime()
    if (elapsed < USERNAME_CHANGE_INTERVAL_MS) {
      const remainingDays = Math.ceil((USERNAME_CHANGE_INTERVAL_MS - elapsed) / (24 * 60 * 60 * 1000))
      return { error: `用户名每月只能修改一次，还需等待 ${remainingDays} 天` }
    }
  }

  // 唯一性
  const existing = await prisma.user.findUnique({ where: { username: newUsername } })
  if (existing) return { error: "该用户名已被使用" }

  const oldUsername = user.username
  await prisma.user.update({
    where: { id: userId },
    data: { username: newUsername, lastUsernameChangeAt: new Date() },
  })

  revalidatePath("/settings")
  revalidatePath(`/profile/${oldUsername}`)
  revalidatePath(`/profile/${newUsername}`)
  return { success: true, message: "用户名修改成功" }
}

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

// 设置/修改安全问题（老用户补设；修改需验证当前密码）
export async function setSecurityQuestion(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const currentPassword = formData.get("currentPassword") as string
  const customQuestion = (formData.get("securityQuestionCustom") as string)?.trim() ?? ""
  const presetQuestion = (formData.get("securityQuestion") as string) ?? ""
  const question = customQuestion || presetQuestion
  const answer = (formData.get("securityAnswer") as string)?.trim() ?? ""

  if (!currentPassword) return { error: "请输入当前密码" }
  if (!question) return { error: "请选择或填写安全问题" }
  if (answer.length < 2) return { error: "安全答案至少2个字符" }
  if (answer.length > 100) return { error: "安全答案最多100字" }

  const user = await prisma.user.findUnique({ where: { id: session.user.id as string } })
  if (!user) return { error: "用户不存在" }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!isValid) return { error: "当前密码错误" }

  const securityAnswer = await bcrypt.hash(answer, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: { securityQuestion: question, securityAnswer },
  })

  return { success: true, message: "安全问题已保存" }
}
