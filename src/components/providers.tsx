"use client"

import { SessionProvider } from "next-auth/react"
import { ToastProvider } from "@/components/toast"
import { useEffect } from "react"
import { setStatusBarStyle } from "@/lib/native"
import type { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  // App 内默认深色系统栏图标（适配浅色页面）；阅读器会自行切换为浅色图标
  useEffect(() => {
    setStatusBarStyle("DARK")
  }, [])

  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  )
}
