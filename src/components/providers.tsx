"use client"

import { SessionProvider } from "next-auth/react"
import { ToastProvider } from "@/components/toast"
import { useEffect } from "react"
import { setStatusBarStyle, syncNativeSafeArea } from "@/lib/native"
import type { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  // 根据页面主题设置系统栏图标颜色；阅读器会自行切换为浅色图标。
  useEffect(() => {
    const dark = document.documentElement.classList.contains("dark")
    setStatusBarStyle(dark ? "LIGHT" : "DARK")
  }, [])

  useEffect(() => {
    const sync = () => {
      void syncNativeSafeArea()
    }

    sync()
    window.addEventListener("resize", sync)
    window.visualViewport?.addEventListener("resize", sync)
    document.addEventListener("visibilitychange", sync)

    return () => {
      window.removeEventListener("resize", sync)
      window.visualViewport?.removeEventListener("resize", sync)
      document.removeEventListener("visibilitychange", sync)
    }
  }, [])

  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  )
}
