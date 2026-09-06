"use client"

import { useEffect, useState } from "react"
import { setStatusBarStyle } from "@/lib/native"

function readPreferredTheme() {
  let theme: "dark" | "light" | null = null

  try {
    const stored = localStorage.getItem("theme")
    if (stored === "dark" || stored === "light") theme = stored
  } catch {
    // localStorage 不可用时继续读取 Cookie。
  }

  if (theme === null) {
    try {
      const stored = document.cookie
        .split("; ")
        .find((value) => value.startsWith("theme="))
        ?.slice(6)
      if (stored === "dark" || stored === "light") theme = stored
    } catch {
      // Cookie 也不可用时回退到系统偏好。
    }
  }

  return theme ?? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    // 某些 App WebView 会在水合时覆盖启动脚本写入的 html class，挂载后再校正一次。
    const isDark = readPreferredTheme() === "dark"
    document.documentElement.classList.toggle("dark", isDark)
    setDark(isDark)
    setStatusBarStyle(isDark ? "LIGHT" : "DARK")
  }, [])

  function toggle() {
    // 以 html 上的实际 class 为准，避免组件状态尚未同步时切换方向错误。
    const next = !document.documentElement.classList.contains("dark")
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    try {
      const value = next ? "dark" : "light"
      document.cookie = `theme=${value}; Max-Age=31536000; Path=/; SameSite=Lax`
    } catch {
      // Cookie 不可用时仍继续尝试写入 localStorage。
    }
    try {
      localStorage.setItem("theme", next ? "dark" : "light")
    } catch {
      // 隐私模式或 WebView 禁止存储时，至少保留当前页面的主题切换。
    }
    setStatusBarStyle(next ? "LIGHT" : "DARK")
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "切换亮色模式" : "切换暗色模式"}
      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
      title={dark ? "切换亮色模式" : "切换暗色模式"}
    >
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      )}
    </button>
  )
}
