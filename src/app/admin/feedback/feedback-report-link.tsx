"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/toast"

// 查看反馈汇总文档（服务端生成的 Markdown）
export function FeedbackReportLink() {
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()
  const [content, setContent] = useState<{ filename: string; text: string } | null>(null)

  function load() {
    startTransition(async () => {
      const { getLatestFeedbackReport } = await import("@/lib/actions/feedback-report")
      const res = await getLatestFeedbackReport()
      if (res?.success) {
        setContent({ filename: res.filename, text: res.content })
      } else {
        toast(res?.error ?? "读取失败", "error")
      }
    })
  }

  if (content) {
    return (
      <div className="w-full">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-medium">{content.filename}</span>
          <Button size="sm" variant="outline" onClick={load} disabled={pending}>
            刷新
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setContent(null)}>
            关闭
          </Button>
        </div>
        <pre className="max-h-[60vh] overflow-auto rounded-lg border bg-muted/30 p-4 text-xs whitespace-pre-wrap">
          {content.text}
        </pre>
      </div>
    )
  }

  return (
    <Button size="sm" variant="outline" onClick={load} disabled={pending}>
      {pending ? "读取中..." : "📄 查看反馈汇总"}
    </Button>
  )
}
