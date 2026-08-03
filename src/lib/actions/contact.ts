"use server"

import { prisma } from "@/lib/db"
import { z } from "zod"

const contactSchema = z.object({
  username: z.string().min(1, "请填写你的用户名").max(20, "用户名过长"),
  qq: z.string().regex(/^[1-9]\d{4,10}$/, "QQ 号格式不正确").optional().or(z.literal("")),
  message: z.string().min(2, "留言至少2个字符").max(500, "留言最多500字"),
})

// 未登录用户给管理员发消息（找回密码等场景）
// 通过用户名定位用户，通知所有管理员
export async function sendContactMessage(prevState: unknown, formData: FormData) {
  const validated = contactSchema.safeParse({
    username: formData.get("username"),
    qq: formData.get("qq"),
    message: formData.get("message"),
  })

  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const { username, qq, message } = validated.data

  // 防刷：同一用户名 5 分钟内只能提交一次
  const recent = await prisma.notification.findFirst({
    where: { type: "CONTACT_ADMIN", content: { contains: `「${username}」` } },
    orderBy: { createdAt: "desc" },
  })
  if (recent) {
    const elapsed = Date.now() - new Date(recent.createdAt).getTime()
    if (elapsed < 5 * 60 * 1000) {
      return { error: "已发送过请求，请耐心等待管理员处理" }
    }
  }

  // 定位用户信息（存在则附带 QQ 与主页链接，方便管理员处理）
  const user = await prisma.user.findUnique({
    where: { username },
    select: { email: true, id: true, status: true },
  })

  // 通知所有管理员（super_admin + admin）
  const admins = await prisma.user.findMany({
    where: { role: { in: ["super_admin", "admin"] } },
    select: { id: true },
  })
  if (admins.length === 0) return { error: "暂无管理员在线，请稍后再试" }

  const qqInfo = qq || user?.email || "未提供"
  const statusInfo = user
    ? user.status === "pending"
      ? "（账号待审核）"
      : user.status === "rejected"
        ? "（账号被拒绝）"
        : ""
    : "（用户名未找到）"
  const content = `用户「${username}」（QQ: ${qqInfo}）${statusInfo}请求联系管理员：${message}`
  const link = `/profile/${encodeURIComponent(username)}`

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: "CONTACT_ADMIN",
        content,
        link,
      },
    })
  }

  return { success: true, message: "消息已发送给管理员，请耐心等待处理" }
}
