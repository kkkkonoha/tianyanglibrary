import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

// 兜底静态服务：next start 启动后新增的 public/uploads 文件（头像/封面/附件）
// 不在 Next 固化路由中，由本路由读磁盘返回，避免 404。
const MIME: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
  epub: "application/epub+zip",
  pdf: "application/pdf",
  txt: "text/plain",
  cbz: "application/vnd.comicbook+zip",
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  if (path.length === 0) return new NextResponse("Not Found", { status: 404 })

  const abs = join(process.cwd(), "public", "uploads", ...path)
  if (!existsSync(abs)) return new NextResponse("Not Found", { status: 404 })

  const data = await readFile(abs)
  const name = path[path.length - 1]
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  return new NextResponse(data, {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
