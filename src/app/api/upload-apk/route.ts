import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

// CI 上传 APK：Bearer token 校验，文件名必须为 tylibrary-vX.Y(.Z).apk
export async function POST(req: NextRequest) {
  const token = process.env.UPLOAD_APK_TOKEN
  if (!token || req.headers.get("authorization") !== `Bearer ${token}`) {
    return NextResponse.json({ error: "未授权" }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "缺少文件" }, { status: 400 })
  }
  if (file.size > 300 * 1024 * 1024) {
    return NextResponse.json({ error: "文件过大" }, { status: 400 })
  }
  if (!/^tylibrary-v\d+\.\d+(\.\d+)?\.apk$/.test(file.name)) {
    return NextResponse.json({ error: "文件名必须为 tylibrary-vX.Y(.Z).apk" }, { status: 400 })
  }

  const dir = join(process.cwd(), "public", "downloads")
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, file.name), Buffer.from(await file.arrayBuffer()))

  return NextResponse.json({ success: true, name: file.name })
}
