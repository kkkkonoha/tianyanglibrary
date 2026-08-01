import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const SUWAYOMI_BASE = process.env.SUWAYOMI_URL ?? "http://127.0.0.1:4567"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const path = req.nextUrl.pathname.replace(/^\/api\/suwayomi\//, "")
  const target = `${SUWAYOMI_BASE}/${path}${req.nextUrl.search}`

  try {
    const res = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TianyangLibrary/1.0)",
      },
    })

    const headers = new Headers()
    const ct = res.headers.get("content-type")
    if (ct) headers.set("content-type", ct)
    const cc = res.headers.get("cache-control")
    if (cc) headers.set("cache-control", cc)

    return new NextResponse(res.body, { status: res.status, headers })
  } catch {
    return NextResponse.json({ error: "漫画服务不可用" }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const path = req.nextUrl.pathname.replace(/^\/api\/suwayomi\//, "")
  const target = `${SUWAYOMI_BASE}/${path}`
  const body = await req.text()

  try {
    const res = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; TianyangLibrary/1.0)",
      },
      body,
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "漫画服务不可用" }, { status: 502 })
  }
}
