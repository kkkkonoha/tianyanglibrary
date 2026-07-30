"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createActivity } from "@/lib/activity"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const resourceSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(["BOOK", "COMIC", "VIDEO", "OTHER"]),
  tags: z.string().optional(),
})

export async function createResource(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const validated = resourceSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    type: formData.get("type"),
    tags: formData.get("tags"),
  })

  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const { title, description, type, tags } = validated.data

  const resource = await prisma.resource.create({
    data: {
      title,
      description: description ?? null,
      type,
      uploaderId: session.user.id as string,
    },
  })

  if (tags?.trim()) {
    const tagNames = tags.split(",").map((t) => t.trim()).filter(Boolean)
    for (const name of tagNames) {
      const tag = await prisma.tag.upsert({
        where: { name },
        create: { name },
        update: {},
      })
      await prisma.resourceTag.create({
        data: { resourceId: resource.id, tagId: tag.id },
      })
    }
  }

  await createActivity({
    type: "UPLOAD",
    userId: session.user.id as string,
    resourceId: resource.id,
  })

  revalidatePath("/")
  revalidatePath("/explore")

  return { success: true, id: resource.id }
}

export async function uploadResourceFile(resourceId: string, formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const file = formData.get("file") as File | null
  if (!file || file.size === 0) return { error: "请选择文件" }

  const maxSize = 500 * 1024 * 1024
  if (file.size > maxSize) return { error: "文件大小不能超过 500MB" }

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  })

  if (!resource || resource.uploaderId !== (session.user.id as string)) {
    return { error: "无权操作" }
  }

  const ext = file.name.split(".").pop() ?? "dat"
  const filename = `${resourceId}-${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const fs = await import("fs/promises")
  const path = await import("path")
  const filePath = path.join(process.cwd(), "uploads", "files", filename)
  await fs.writeFile(filePath, buffer)

  await prisma.resource.update({
    where: { id: resourceId },
    data: { fileUrl: `/uploads/files/${filename}` },
  })

  revalidatePath(`/resource/${resourceId}`)
  return { success: true, fileUrl: `/uploads/files/${filename}` }
}

export async function uploadCover(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const resourceId = formData.get("resourceId") as string
  const file = formData.get("cover") as File | null

  if (!resourceId) return { error: "缺少资源 ID" }
  if (!file || file.size === 0) return { error: "请选择封面" }

  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) return { error: "封面文件不能超过 10MB" }

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
  })

  if (!resource || resource.uploaderId !== (session.user.id as string)) {
    return { error: "无权操作" }
  }

  const ext = file.name.split(".").pop() ?? "jpg"
  const filename = `cover-${resourceId}-${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const fs = await import("fs/promises")
  const path = await import("path")
  const filePath = path.join(process.cwd(), "uploads", "covers", filename)
  await fs.writeFile(filePath, buffer)

  await prisma.resource.update({
    where: { id: resourceId },
    data: { coverImage: `/uploads/covers/${filename}` },
  })

  revalidatePath(`/resource/${resourceId}`)
  return { success: true, coverImage: `/uploads/covers/${filename}` }
}
