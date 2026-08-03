"use server"

import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { z } from "zod"

const resetSchema = z
  .object({
    qq: z.string().regex(/^[1-9]\d{4,10}$/, "QQ 号格式不正确"),
    username: z.string().min(1, "请输入用户名"),
    answer: z.string().min(1, "请输入安全答案"),
    newPassword: z.string().min(6, "新密码至少6个字符"),
    confirmPassword: z.string().min(6, "确认密码至少6个字符"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  })

// 自助找回密码：验证 QQ + 用户名 + 安全答案后重置
export async function resetForgottenPassword(prevState: unknown, formData: FormData) {
  const validated = resetSchema.safeParse({
    qq: formData.get("qq"),
    username: formData.get("username"),
    answer: formData.get("answer"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const { qq, username, answer, newPassword } = validated.data

  const user = await prisma.user.findUnique({
    where: { email: qq },
    select: { id: true, username: true, securityQuestion: true, securityAnswer: true },
  })

  // 统一提示，不泄露账号是否存在 / 是否设置了安全问题
  if (!user || user.username !== username) {
    return { error: "信息不匹配，请核对 QQ 号与用户名" }
  }
  if (!user.securityQuestion || !user.securityAnswer) {
    return { error: "该账号未设置安全问题，请联系管理员重置密码" }
  }

  const answerOk = await bcrypt.compare(answer, user.securityAnswer)
  if (!answerOk) {
    return { error: "信息不匹配，请核对 QQ 号与用户名" }
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  })

  return { success: true, message: "密码已重置，请使用新密码登录" }
}
