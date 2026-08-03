import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isReader = /^\/comics\/.+\/read$/.test(pathname)

  // 静态上传资源（头像/封面/附件）：公开 + 缓存头（不属于登录保护的页面）
  if (pathname.startsWith("/uploads/")) {
    const response = NextResponse.next()
    // 封面/头像内容会随上传或恢复而变化：短缓存（1 小时），重传后新 URL 立即生效
    if (pathname.startsWith("/uploads/covers/") || pathname.startsWith("/uploads/avatars/")) {
      response.headers.set("Cache-Control", "public, max-age=3600")
    } else {
      // 附件文件不可变：长缓存
      response.headers.set("Cache-Control", "public, max-age=31536000, immutable")
    }
    return response
  }

  // 全站登录保护：未登录访问受保护页面 → 跳转登录
  // （/api、/login、/register、/uploads、静态资源已在 matcher 中排除）
  const sessionCookie =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token")
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (isReader) {
    // 阅读器页面：告知布局隐藏网站导航，实现完全沉浸
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-pathname", pathname)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // 上传资源：单独匹配以保留缓存头处理
    "/uploads/:path*",
    // 登录保护范围：排除 api（内部鉴权）、uploads、登录/注册/找回密码/联系管理员页、Next 静态资源
    "/((?!api|uploads|_next/static|_next/image|favicon.ico|login|register|forgot-password|contact-admin).*)",
  ],
}
