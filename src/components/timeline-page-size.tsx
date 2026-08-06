"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const STORAGE_KEY = "timeline-page-size"
const MAX_SIZE = 1000
const PRESETS = [20, 50, 100]

// 每页条数设置：预设 20/50/100 + 自定义输入；偏好记忆在 localStorage
export function TimelinePageSize({ currentSize }: { currentSize: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState("")

  function apply(size: number) {
    if (!Number.isInteger(size) || size < 1 || size > MAX_SIZE) return
    try {
      localStorage.setItem(STORAGE_KEY, String(size))
    } catch {}
    // 保留当前 types 选择，替换 size，回到第 1 页
    const sp = new URLSearchParams(window.location.search)
    if (size !== 20) sp.set("size", String(size))
    else sp.delete("size")
    sp.delete("page")
    const qs = sp.toString()
    router.push(qs ? `/?${qs}` : "/")
    setOpen(false)
  }

  // 挂载时应用 localStorage 偏好（与当前 URL 不同则跳转生效）
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const n = parseInt(saved, 10)
      if (Number.isInteger(n) && n >= 1 && n <= MAX_SIZE && n !== currentSize) {
        const sp = new URLSearchParams(window.location.search)
        if (n !== 20) sp.set("size", String(n))
        else sp.delete("size")
        sp.delete("page")
        const qs = sp.toString()
        router.replace(qs ? `/?${qs}` : "/")
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title={`每页条数：${currentSize}`}
        className="flex h-7 w-7 items-center justify-center rounded-full text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        ⚙️
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-56 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-popover p-2.5 shadow-md">
            <p className="mb-1.5 text-xs text-muted-foreground">每页显示条数</p>
            <div className="flex gap-1">
              {PRESETS.map((n) => (
                <button
                  key={n}
                  onClick={() => apply(n)}
                  className={`flex-1 rounded-md px-2 py-1 text-sm transition-colors ${
                    currentSize === n
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-1">
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                type="number"
                min={1}
                max={MAX_SIZE}
                placeholder="自定义"
                className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const n = parseInt(custom, 10)
                    if (Number.isInteger(n) && n >= 1 && n <= MAX_SIZE) apply(n)
                  }
                }}
              />
              <button
                onClick={() => {
                  const n = parseInt(custom, 10)
                  if (Number.isInteger(n) && n >= 1 && n <= MAX_SIZE) apply(n)
                }}
                className="rounded-md bg-primary px-2.5 py-1 text-sm text-primary-foreground hover:bg-primary/90"
              >
                确定
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-muted-foreground/60">范围 1-1000，选择自动记忆</p>
          </div>
        </>
      )}
    </div>
  )
}
