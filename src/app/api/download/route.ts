import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function GET(req: NextRequest) {
  const relPath = req.nextUrl.searchParams.get("path")
  if (!relPath) return NextResponse.json({ error: "缺少路径" }, { status: 400 })

  const sanitizedPath = relPath.startsWith("/") ? relPath.slice(1) : relPath
  const fullPath = join(process.cwd(), "public", sanitizedPath)
  if (!existsSync(fullPath)) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 })
  }

  const name = req.nextUrl.searchParams.get("name")
    || sanitizedPath.split("/").pop()
    || "download"

  const buffer = await readFile(fullPath)

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Content-Length": String(buffer.length),
    },
  })
}
