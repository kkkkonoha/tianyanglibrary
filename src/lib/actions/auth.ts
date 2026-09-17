"use server"

import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { saveAvatarFile } from "@/lib/avatar-file"
import { randomUUID } from "crypto"

const registerSchema = z.object({
  qq: z
    .string()
    .regex(/^[1-9]\d{4,10}$/, "请输入有效的 QQ 号（5-11位数字）"),
  username: z
    .string()
    .min(2, "用户名至少2个字符")
    .max(20, "用户名最多20个字符")
    .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, "用户名只能包含字母、数字、下划线和中文"),
  password: z.string().min(6, "密码至少6个字符"),
  confirmPassword: z.string().min(6, "确认密码至少6个字符"),
  securityQuestion: z.string().min(1, "请选择或填写安全问题").max(100),
  securityAnswer: z.string().min(2, "安全答案至少2个字符").max(100),
  bio: z.string().trim().min(1, "请填写个人简介").max(500, "个人简介最多500字"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
})

export async function register(prevState: unknown, formData: FormData) {
  // 安全问题：自定义优先，否则用预设
  const customQuestion = (formData.get("securityQuestionCustom") as string)?.trim() ?? ""
  const presetQuestion = (formData.get("securityQuestion") as string) ?? ""
  const question = customQuestion || presetQuestion

  const validated = registerSchema.safeParse({
    qq: formData.get("qq"),
    username: formData.get("username"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    securityQuestion: question,
    securityAnswer: formData.get("securityAnswer"),
    bio: formData.get("bio"),
  })

  if (!validated.success) {
    return {
      error: validated.error.issues[0].message,
      fields: getRegisterFields(formData),
    }
  }

  const { qq, username, password, securityQuestion, securityAnswer, bio } = validated.data
  const avatar = formData.get("avatar")
  if (!(avatar instanceof File) || avatar.size === 0) {
    return { error: "请上传头像", fields: getRegisterFields(formData) }
  }
  if (avatar.size > 5 * 1024 * 1024 || !avatar.type.startsWith("image/")) {
    return { error: "头像必须是 5MB 以内的图片", fields: getRegisterFields(formData) }
  }

  const existingQQ = await prisma.user.findUnique({ where: { email: qq } })
  if (existingQQ) {
    return { error: "该 QQ 号已被注册", fields: getRegisterFields(formData) }
  }

  const existingUsername = await prisma.user.findUnique({ where: { username } })
  if (existingUsername) {
    return { error: "该用户名已被使用", fields: getRegisterFields(formData) }
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const securityAnswerHash = await bcrypt.hash(securityAnswer, 10)
  const avatarPath = await saveAvatarFile(avatar, randomUUID())

  await prisma.user.create({
    data: {
      email: qq,
      username,
      passwordHash,
      avatar: avatarPath,
      bio,
      status: "pending",
      securityQuestion,
      securityAnswer: securityAnswerHash,
    },
  })

  return { success: true, message: "注册成功，请等待管理员审核通过后方可登录" }
}

function getRegisterFields(formData: FormData) {
  return {
    qq: String(formData.get("qq") ?? ""),
    username: String(formData.get("username") ?? ""),
    securityQuestion: String(formData.get("securityQuestion") ?? ""),
    securityQuestionCustom: String(formData.get("securityQuestionCustom") ?? ""),
    securityAnswer: String(formData.get("securityAnswer") ?? ""),
    bio: String(formData.get("bio") ?? ""),
  }
}
