"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { READING_STATUS_LABELS } from "@/lib/reading-status-constants"
const statusSchema = z.enum(["WANT", "READING", "READ", "DROPPED"])
const noteSchema = z.string().trim().max(500, "短评最多500字")

function activityMetadata(status: string, note: string | null, historyId: string) {
  return JSON.stringify({ status, note, historyId })
}

export async function setReadingStatus(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const resourceId = Number(formData.get("resourceId"))
  const statusResult = statusSchema.safeParse(formData.get("status"))
  const rawNote = String(formData.get("note") ?? "")
  const noteResult = noteSchema.safeParse(rawNote)

  if (!Number.isInteger(resourceId)) return { error: "资源 ID 无效" }
  if (!statusResult.success) return { error: "阅读状态无效" }
  if (!noteResult.success) return { error: noteResult.error.issues[0].message }

  const userId = session.user.id as string
  const status = statusResult.data
  const note = noteResult.data || null

  const resource = await prisma.resource.findUnique({ where: { id: resourceId }, select: { id: true } })
  if (!resource) return { error: "资源不存在" }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.readingStatusEntry.findUnique({
      where: { userId_resourceId: { userId, resourceId } },
    })

    if (!existing) {
      const entry = await tx.readingStatusEntry.create({
        data: { userId, resourceId, status, note },
      })
      const history = await tx.readingStatusHistory.create({
        data: { entryId: entry.id, userId, resourceId, toStatus: status, note },
      })
      const activity = await tx.activity.create({
        data: {
          type: "READING_STATUS",
          userId,
          resourceId,
          metadata: activityMetadata(status, note, history.id),
        },
      })
      await tx.readingStatusHistory.update({ where: { id: history.id }, data: { activityId: activity.id } })
      await tx.readingStatusEntry.update({ where: { id: entry.id }, data: { activityId: activity.id } })
      return
    }

    if (existing.status !== status) {
      const history = await tx.readingStatusHistory.create({
        data: {
          entryId: existing.id,
          userId,
          resourceId,
          fromStatus: existing.status,
          toStatus: status,
          note,
        },
      })
      const activity = await tx.activity.create({
        data: {
          type: "READING_STATUS",
          userId,
          resourceId,
          metadata: activityMetadata(status, note, history.id),
        },
      })
      await tx.readingStatusHistory.update({ where: { id: history.id }, data: { activityId: activity.id } })
      await tx.readingStatusEntry.update({
        where: { id: existing.id },
        data: { status, note, activityId: activity.id },
      })
      return
    }

    // 仅编辑短评：更新当前动态和讨论版，不再新增一条动态。
    await tx.readingStatusEntry.update({ where: { id: existing.id }, data: { note } })
    if (existing.activityId) {
      const currentActivity = await tx.activity.findUnique({ where: { id: existing.activityId }, select: { metadata: true } })
      if (currentActivity?.metadata) {
        try {
          const parsed = JSON.parse(currentActivity.metadata) as { status?: string; historyId?: string }
          await tx.activity.update({
            where: { id: existing.activityId },
            data: { metadata: activityMetadata(parsed.status ?? status, note, parsed.historyId ?? "") },
          })
        } catch {
          await tx.activity.update({
            where: { id: existing.activityId },
            data: { metadata: activityMetadata(status, note, "") },
          })
        }
      }
    }
  })

  revalidatePath(`/resource/${resourceId}`)
  revalidatePath(`/comics`)
  revalidatePath(`/`)
  revalidatePath(`/favorites`)
  return { success: true }
}
