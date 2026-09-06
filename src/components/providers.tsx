"use client"

import { SessionProvider } from "next-auth/react"
import { ToastProvider } from "@/components/toast"
import { useEffect } from "react"
import { setStatusBarStyle } from "@/lib/native"
import type { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  // 根据页面主题设置系统栏图标颜色；阅读器会自行切换为浅色图标。
  useEffect(() => {
    const dark = document.documentElement.classList.contains("dark")
    setStatusBarStyle(dark ? "LIGHT" : "DARK")
  }, [])

  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  )
}
