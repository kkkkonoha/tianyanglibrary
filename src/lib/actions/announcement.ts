"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { readFile } from "fs/promises"
import { join } from "path"

const announcementSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(100, "标题最多100字"),
  content: z.string().min(1, "内容不能为空").max(20000, "内容最多20000字"),
  pinned: z.boolean().default(false),
})

// 手动发布公告（管理员）
export async function publishAnnouncement(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }
  if (!isAdmin(session)) return { error: "无权操作" }

  const validated = announcementSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    pinned: formData.get("pinned") === "on",
  })
  if (!validated.success) return { error: validated.error.issues[0].message }

  await prisma.activity.create({
    data: {
      type: "ANNOUNCEMENT",
      userId: session.user.id as string,
      title: validated.data.title.trim(),
      metadata: validated.data.content.trim(),
      pinnedAt: validated.data.pinned ? new Date() : null,
    },
  })

  revalidatePath("/")
  revalidatePath("/admin")
  return { success: true }
}

// 读取 CHANGELOG 最新版本块（用于预览与发布）
async function readLatestChangelog() {
  let content: string
  try {
    content = await readFile(join(process.cwd(), "CHANGELOG.md"), "utf-8")
  } catch {
    return null
  }
  const m = content.match(/^## \[([^\]]+)\] - (\d{4}-\d{2}-\d{2})/m)
  if (!m) return null
  const version = m[1]
  const date = m[2]
  const idx = m.index ?? 0
  const next = content.indexOf("## [", idx + 2)
  const body = content.slice(idx, next >= 0 ? next : undefined).trim()
  const bodyClean = body.replace(/^## \[[^\]]+\] - [^\n]*\n?/, "").trim()
  return { version, date, body: bodyClean }
}

// 面板查询：最新版本 vs 已发布状态
export async function getChangelogStatus() {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }
  if (!isAdmin(session)) return { error: "无权操作" }

  const latest = await readLatestChangelog()
  if (!latest) return { latest: null, alreadyPublished: true }

  const existing = await prisma.activity.findFirst({
    where: { type: "ANNOUNCEMENT", title: `版本 ${latest.version} 更新` },
    select: { id: true },
  })
  return { latest, alreadyPublished: !!existing }
}

// 从 CHANGELOG 发布最新版本公告（管理员）
export async function publishChangelogAnnouncement() {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }
  if (!isAdmin(session)) return { error: "无权操作" }

  const latest = await readLatestChangelog()
  if (!latest) return { error: "未找到版本信息" }

  const existing = await prisma.activity.findFirst({
    where: { type: "ANNOUNCEMENT", title: `版本 ${latest.version} 更新` },
    select: { id: true },
  })
  if (existing) return { error: `版本 ${latest.version} 已发布过` }

  await prisma.activity.create({
    data: {
      type: "ANNOUNCEMENT",
      userId: session.user.id as string,
      title: `版本 ${latest.version} 更新`,
      metadata: latest.body,
      pinnedAt: null,
    },
  })

  revalidatePath("/")
  revalidatePath("/admin")
  return { success: true, version: latest.version }
}

// 切换公告置顶（管理员）
export async function togglePinAnnouncement(activityId: string) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }
  if (!isAdmin(session)) return { error: "无权操作" }

  const activity = await prisma.activity.findUnique({ where: { id: activityId } })
  if (!activity || activity.type !== "ANNOUNCEMENT") return { error: "公告不存在" }

  await prisma.activity.update({
    where: { id: activityId },
    data: { pinnedAt: activity.pinnedAt ? null : new Date() },
  })

  revalidatePath("/")
  revalidatePath("/admin")
  return { success: true, pinned: !activity.pinnedAt }
}

// 删除公告（管理员）
export async function deleteAnnouncement(activityId: string) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }
  if (!isAdmin(session)) return { error: "无权操作" }

  const activity = await prisma.activity.findUnique({ where: { id: activityId } })
  if (!activity || activity.type !== "ANNOUNCEMENT") return { error: "公告不存在" }

  await prisma.activity.delete({ where: { id: activityId } })

  revalidatePath("/")
  revalidatePath("/admin")
  return { success: true }
}
