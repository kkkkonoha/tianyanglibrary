"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { isNativeApp } from "@/lib/native"

// 下载 App 入口：App 内自动隐藏（正在使用 App 无需下载自己）
export function DownloadAppLink({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(!isNativeApp())
  }, [])

  if (!show) return null
  return (
    <Link href="/app" className={className}>
      {children ?? "下载手机 App"}
    </Link>
  )
}
