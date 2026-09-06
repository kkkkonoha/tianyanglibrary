import { NextResponse } from "next/server"
import { readdir, readFile } from "fs/promises"
import { join } from "path"
import { compareApkVersions, getApkFilename, parseApkVersion } from "@/lib/apk"

// APK 下载：应用层读文件流式返回（Next public 静态服务不服务新建的 .apk 文件）
export async function GET() {
  let files: string[]
  try {
    files = await readdir(join(process.cwd(), "public", "downloads"))
  } catch {
    return NextResponse.json({ error: "暂无安装包" }, { status: 404 })
  }
  const apks = files
    .filter((name) => name.endsWith(".apk"))
    .map((name) => ({ name, version: parseApkVersion(name) }))
    .sort((a, b) => compareApkVersions(a.version, b.version))
  if (apks.length === 0) {
    return NextResponse.json({ error: "暂无安装包" }, { status: 404 })
  }

  const { name, version } = apks[0]
  const downloadName = version ? getApkFilename(version) : name
  try {
    const buf = await readFile(join(process.cwd(), "public", "downloads", name))
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="tianyang-library.apk"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        "Content-Length": String(buf.length),
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "读取失败" }, { status: 500 })
  }
}
