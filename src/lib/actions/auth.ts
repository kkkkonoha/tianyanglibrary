"use server"

import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { z } from "zod"

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
})

export async function register(prevState: unknown, formData: FormData) {
  const validated = registerSchema.safeParse({
    qq: formData.get("qq"),
    username: formData.get("username"),
    password: formData.get("password"),
  })

  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const { qq, username, password } = validated.data

  const existingQQ = await prisma.user.findUnique({ where: { email: qq } })
  if (existingQQ) {
    return { error: "该 QQ 号已被注册" }
  }

  const existingUsername = await prisma.user.findUnique({ where: { username } })
  if (existingUsername) {
    return { error: "该用户名已被使用" }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: {
      email: qq,
      username,
      passwordHash,
      status: "pending",
    },
  })

  return { success: true, message: "注册成功，请等待管理员审核通过后方可登录" }
}
