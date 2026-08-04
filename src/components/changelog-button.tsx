"use client"

import { useState, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// 轻量 Markdown 解析：## 版本标题 / ### 小节 / - 列表项 / 其他正文
function renderChangelog(content: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let key = 0
  const lines = content.split("\n")

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h3 key={key++} className="mt-4 mb-1.5 text-base font-bold first:mt-0">
          {trimmed.slice(3)}
        </h3>
      )
    } else if (trimmed.startsWith("### ")) {
      nodes.push(
        <h4 key={key++} className="mt-3 mb-1 text-sm font-semibold text-muted-foreground">
          {trimmed.slice(4)}
        </h4>
      )
    } else if (trimmed.startsWith("- ")) {
      nodes.push(
        <li key={key++} className="ml-4 list-disc text-sm leading-relaxed text-foreground/85">
          {trimmed.slice(2)}
        </li>
      )
    } else {
      nodes.push(
        <p key={key++} className="text-sm text-muted-foreground">
          {trimmed}
        </p>
      )
    }
  }
  return nodes
}

// 动态页右下角悬浮按钮：点击弹窗查看更新日志
export function ChangelogButton() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [content, setContent] = useState<string | null>(null)

  function load() {
    if (content) {
      setOpen(true)
      return
    }
    startTransition(async () => {
      const { getChangelog } = await import("@/lib/actions/changelog")
      const res = await getChangelog()
      if (res?.success) {
        setContent(res.content)
        setOpen(true)
      } else {
        alert(res?.error ?? "读取失败")
      }
    })
  }

  return (
    <>
      <button
        onClick={load}
        title="更新日志"
        className="fixed bottom-20 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border bg-background/90 text-lg shadow-lg backdrop-blur transition-all hover:scale-105 hover:border-primary/40 sm:bottom-6 sm:right-6"
      >
        📜
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>更新日志</DialogTitle>
          </DialogHeader>
          {pending && !content ? (
            <p className="py-8 text-center text-sm text-muted-foreground">加载中...</p>
          ) : content ? (
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              {renderChangelog(content)}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
