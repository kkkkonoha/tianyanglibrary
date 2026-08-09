"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { isNativeApp } from "@/lib/native"

// App 内访问下载页时跳回首页（正在使用 App 无需下载）
export function NativeRedirect() {
  const router = useRouter()
  useEffect(() => {
    if (isNativeApp()) router.replace("/")
  }, [router])
  return null
}
