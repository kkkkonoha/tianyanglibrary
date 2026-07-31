import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const response = NextResponse.next()
  response.headers.set("Cache-Control", "public, max-age=31536000, immutable")
  return response
}

export const config = {
  matcher: "/uploads/:path*",
}
