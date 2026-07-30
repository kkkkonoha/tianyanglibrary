"use server"

import bcrypt from "bcryptjs"
import { signIn } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱"),
  username: z
    .string()
    .min(2, "用户名至少2个字符")
    .max(20, "用户名最多20个字符")
    .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, "用户名只能包含字母、数字、下划线和中文"),
  password: z.string().min(6, "密码至少6个字符"),
})

export async function register(prevState: unknown, formData: FormData) {
  const validated = registerSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
  })

  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const { email, username, password } = validated.data

  const existingEmail = await prisma.user.findUnique({ where: { email } })
  if (existingEmail) {
    return { error: "该邮箱已被注册" }
  }

  const existingUsername = await prisma.user.findUnique({ where: { username } })
  if (existingUsername) {
    return { error: "该用户名已被使用" }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
    },
  })

  return { success: true }
}
