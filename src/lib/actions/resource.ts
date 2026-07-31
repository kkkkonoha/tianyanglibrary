"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createActivity } from "@/lib/activity"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { isAdmin } from "@/lib/permissions"

const resourceSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200),
  author: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  type: z.enum(["BOOK", "COMIC"]),
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

  const { title, author, description, type, tags } = validated.data

  const resource = await prisma.resource.create({
    data: {
      title,
      author: author ?? null,
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

export async function updateResource(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const id = formData.get("id") as string
  const resource = await prisma.resource.findUnique({ where: { id } })
  if (!resource) return { error: "资源不存在" }
  if (!isAdmin(session) && resource.uploaderId !== (session.user.id as string)) {
    return { error: "无权操作" }
  }

  const validated = resourceSchema.safeParse({
    title: formData.get("title"),
    author: formData.get("author"),
    description: formData.get("description"),
    type: formData.get("type"),
    tags: formData.get("tags"),
  })

  if (!validated.success) {
    return { error: validated.error.issues[0].message }
  }

  const { title, author, description, type, tags } = validated.data

  await prisma.resource.update({
    where: { id },
    data: { title, author: author ?? null, description: description ?? null, type },
  })

  if (tags !== undefined) {
    await prisma.resourceTag.deleteMany({ where: { resourceId: id } })
    if (tags.trim()) {
      const tagNames = tags.split(",").map((t) => t.trim()).filter(Boolean)
      for (const name of tagNames) {
        const tag = await prisma.tag.upsert({
          where: { name },
          create: { name },
          update: {},
        })
        await prisma.resourceTag.create({
          data: { resourceId: id, tagId: tag.id },
        })
      }
    }
  }

  revalidatePath(`/resource/${id}`)
  revalidatePath("/")
  revalidatePath("/explore")
  return { success: true }
}

export async function deleteResource(formData: FormData) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const id = formData.get("id") as string
  const resource = await prisma.resource.findUnique({ where: { id } })
  if (!resource) return { error: "资源不存在" }
  if (!isAdmin(session) && resource.uploaderId !== (session.user.id as string)) {
    return { error: "无权操作" }
  }

  await prisma.resource.delete({ where: { id } })

  revalidatePath("/")
  revalidatePath("/explore")
  redirect("/")
}
