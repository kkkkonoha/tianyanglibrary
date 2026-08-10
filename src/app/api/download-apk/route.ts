import { NextResponse } from "next/server"
import { readdir, readFile } from "fs/promises"
import { join } from "path"

// APK 下载：应用层读文件流式返回（Next public 静态服务不服务新建的 .apk 文件）
export async function GET() {
  let files: string[]
  try {
    files = await readdir(join(process.cwd(), "public", "downloads"))
  } catch {
    return NextResponse.json({ error: "暂无安装包" }, { status: 404 })
  }
  const apks = files.filter((f) => f.endsWith(".apk")).sort().reverse()
  if (apks.length === 0) {
    return NextResponse.json({ error: "暂无安装包" }, { status: 404 })
  }

  const name = apks[0]
  try {
    const buf = await readFile(join(process.cwd(), "public", "downloads", name))
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Content-Length": String(buf.length),
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "读取失败" }, { status: 500 })
  }
}
