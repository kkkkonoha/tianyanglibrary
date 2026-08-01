import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isReader = /^\/comics\/.+\/read$/.test(pathname)

  if (isReader) {
    // 阅读器页面：告知布局隐藏网站导航，实现完全沉浸
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-pathname", pathname)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  if (pathname.startsWith("/uploads/")) {
    const response = NextResponse.next()
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable")
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/uploads/:path*", "/comics/:path*/read"],
}
