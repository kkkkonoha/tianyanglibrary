"use server"

import { auth } from "@/lib/auth"
import { ensureComicResource } from "@/lib/comic-import"
import { createActivity } from "@/lib/activity"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

const comicImportSchema = z.object({
  mangaId: z.string().regex(/^\d+$/),
  sourceId: z.string().min(1),
})

// 手动入库：由用户点击「入库」按钮触发，创建本地条目并生成 UPLOAD 动态。
export async function importComicResource(mangaId: string, sourceId: string) {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  const validated = comicImportSchema.safeParse({ mangaId, sourceId })
  if (!validated.success) return { error: "参数错误" }

  const result = await ensureComicResource(mangaId, sourceId, session.user.id as string)
  if (result.error) return { error: result.error }

  if (!result.alreadyExisted) {
    await createActivity({
      type: "UPLOAD",
      userId: session.user.id as string,
      resourceId: result.resourceId,
    })
  }

  revalidatePath("/")
  revalidatePath(`/comics/${mangaId}`)
  redirect(`/resource/${result.resourceId}`)
}
