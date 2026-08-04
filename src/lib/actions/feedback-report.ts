"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { readFile, readdir } from "fs/promises"
import { join } from "path"

// 反馈汇总文档目录（服务器私有，不进公开目录）
const FEEDBACK_REPORT_DIR = "/root/library/feedback-reports"

async function isManager() {
  const session = await auth()
  if (!session?.user) return false
  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { role: true, roleHidden: true },
  })
  return user?.role === "super_admin" && user.roleHidden === true
}

// 读取最新的反馈汇总文档
export async function getLatestFeedbackReport() {
  if (!(await isManager())) return { error: "无权操作" }

  try {
    const files = await readdir(FEEDBACK_REPORT_DIR)
    const mdFiles = files.filter((f) => f.endsWith(".md")).sort().reverse()
    if (mdFiles.length === 0) {
      return { error: "还没有生成汇总文档" }
    }
    const content = await readFile(join(FEEDBACK_REPORT_DIR, mdFiles[0]), "utf8")
    return { success: true, filename: mdFiles[0], content }
  } catch {
    return { error: "文档读取失败" }
  }
}
