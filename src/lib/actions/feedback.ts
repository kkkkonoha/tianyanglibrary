"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { revalidatePath } from "next/cache"

// 反馈管理权限：隐藏超管（实际负责人），公用超管账号不可见
export async function isFeedbackManager() {
  const session = await auth()
  if (!session?.user) return false
  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { role: true, roleHidden: true },
  })
  return user?.role === "super_admin" && user.roleHidden === true
}

const feedbackSchema = z.object({
  type: z.enum(["BUG", "FEATURE"]),
  title: z.string().min(1, "标题不能为空").max(100, "标题最多100字"),
  content: z.string().min(5, "描述至少5个字").max(2000, "描述最多2000字"),
})

export async function submitFeedback(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  try {
    const validated = feedbackSchema.safeParse({
      type: formData.get("type"),
      title: formData.get("title"),
      content: formData.get("content"),
    })
    if (!validated.success) return { error: validated.error.issues[0].message }

    const feedback = await prisma.feedback.create({
      data: {
        userId: session.user.id as string,
        type: validated.data.type,
        title: validated.data.title.trim(),
        content: validated.data.content.trim(),
      },
    })

    // 通知实际负责人（隐藏超管），不广播
    const manager = await prisma.user.findFirst({
      where: { role: "super_admin", roleHidden: true },
      select: { id: true },
    })
    if (manager) {
      const typeLabel = validated.data.type === "BUG" ? "Bug" : "功能需求"
      await prisma.notification.create({
        data: {
          userId: manager.id,
          type: "FEEDBACK",
          content: `新的${typeLabel}反馈：「${validated.data.title}」（来自 ${session.user.name}）`,
          link: "/admin/feedback",
        },
      })
    }

    revalidatePath("/feedback")
    return { success: true, id: feedback.id }
  } catch (e) {
    console.error("submitFeedback 失败:", e)
    return { error: "提交失败，请稍后重试" }
  }
}

// 用户撤回自己的反馈（仅待处理状态，软删除 + 删除管理员通知 + 日志保留）
export async function withdrawFeedback(feedbackId: string) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  try {
    const feedback = await prisma.feedback.findUnique({ where: { id: feedbackId } })
    if (!feedback) return { error: "反馈不存在" }
    if (feedback.userId !== (session.user.id as string)) return { error: "只能撤回自己的反馈" }
    if (feedback.status !== "pending") return { error: "仅待处理状态的反馈可以撤回" }
    if (feedback.withdrawnAt) return { error: "该反馈已撤回" }

    await prisma.feedback.update({
      where: { id: feedbackId },
      data: { withdrawnAt: new Date() },
    })

    // 删除管理员侧对应通知（按标题匹配），撤回不产生新通知
    await prisma.notification.deleteMany({
      where: { type: "FEEDBACK", content: { contains: `「${feedback.title}」` } },
    })

    // 服务器日志保留撤回记录
    console.log(`[feedback] 用户 ${session.user.name} 撤回了反馈「${feedback.title}」(${feedback.id})`)

    revalidatePath("/feedback")
    revalidatePath("/admin/feedback")
    return { success: true }
  } catch (e) {
    console.error("withdrawFeedback 失败:", e)
    return { error: "撤回失败，请重试" }
  }
}

export async function updateFeedbackStatus(feedbackId: string, status: string) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }
  if (!(await isFeedbackManager())) return { error: "无权操作" }
  if (!["pending", "processing", "done"].includes(status)) return { error: "无效状态" }

  try {
    await prisma.feedback.update({
      where: { id: feedbackId },
      data: { status },
    })
    revalidatePath("/admin/feedback")
    revalidatePath("/feedback")
    return { success: true }
  } catch (e) {
    console.error("updateFeedbackStatus 失败:", e)
    return { error: "操作失败，请重试" }
  }
}

export async function replyFeedback(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }
  if (!(await isFeedbackManager())) return { error: "无权操作" }

  const feedbackId = formData.get("feedbackId") as string
  const reply = (formData.get("reply") as string)?.trim() ?? ""
  if (!reply) return { error: "回复内容不能为空" }

  try {
    const feedback = await prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: { user: { select: { id: true } } },
    })
    if (!feedback) return { error: "反馈不存在" }

    await prisma.feedback.update({
      where: { id: feedbackId },
      data: { reply, repliedAt: new Date(), status: feedback.status === "pending" ? "processing" : feedback.status },
    })

    // 通知提交用户
    await prisma.notification.create({
      data: {
        userId: feedback.user.id,
        type: "FEEDBACK_REPLY",
        content: `管理员回复了你的反馈「${feedback.title}」`,
        link: "/feedback",
      },
    })

    revalidatePath("/admin/feedback")
    revalidatePath("/feedback")
    return { success: true }
  } catch (e) {
    console.error("replyFeedback 失败:", e)
    return { error: "回复失败，请重试" }
  }
}
