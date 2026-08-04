"use server"

import { auth } from "@/lib/auth"
import { readFile } from "fs/promises"

// 读取更新日志（CHANGELOG.md，随部署同步到服务器）
export async function getChangelog() {
  const session = await auth()
  if (!session?.user) return { error: "请先登录" }

  try {
    const content = await readFile("/root/library/CHANGELOG.md", "utf8")
    return { success: true, content }
  } catch {
    return { error: "更新日志读取失败" }
  }
}
