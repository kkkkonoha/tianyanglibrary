"use client"

import { usePathname } from "next/navigation"

// 根据当前路径实时控制网站导航（Navbar/MobileNav）显隐：
// 阅读器路径隐藏网站 UI，实现完全沉浸；客户端导航（软导航）同样生效。
export function ReaderAwareLayout({
  navbar,
  mobilenav,
  children,
}: {
  navbar: React.ReactNode
  mobilenav: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isReader = /^\/comics\/.+\/read$/.test(pathname ?? "")

  if (isReader) {
    return <main className="min-h-screen">{children}</main>
  }

  return (
    <>
      {navbar}
      <main className="min-h-screen pb-14 sm:pb-0">{children}</main>
      {mobilenav}
    </>
  )
}
