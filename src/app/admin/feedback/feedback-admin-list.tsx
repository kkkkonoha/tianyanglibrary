"use client"

import { useRouter } from "next/navigation"
import { useTransition, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

const statusLabels: Record<string, string> = {
  pending: "待处理",
  processing: "处理中",
  done: "已处理",
}

export function FeedbackAdminList({
  feedbacks,
}: {
  feedbacks: Array<{
    id: string
    type: string
    title: string
    content: string
    status: string
    reply: string | null
    createdAt: Date
    user: { username: string }
  }>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [replying, setReplying] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")

  function setStatus(id: string, status: string) {
    startTransition(async () => {
      const { updateFeedbackStatus } = await import("@/lib/actions/feedback")
      await updateFeedbackStatus(id, status)
      router.refresh()
    })
  }

  function sendReply(id: string) {
    startTransition(async () => {
      const { replyFeedback } = await import("@/lib/actions/feedback")
      const formData = new FormData()
      formData.set("feedbackId", id)
      formData.set("reply", replyText)
      await replyFeedback(formData)
      setReplying(null)
      setReplyText("")
      router.refresh()
    })
  }

  if (feedbacks.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">暂无反馈</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {feedbacks.map((f) => (
        <Card key={f.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={f.type === "BUG" ? "destructive" : "default"}>
                {f.type === "BUG" ? "🐞 Bug" : "✨ 需求"}
              </Badge>
              <span className="font-medium">{f.title}</span>
              <span className="text-xs text-muted-foreground">by {f.user.username}</span>
              <span className="ml-auto text-xs text-muted-foreground/60">
                {new Date(f.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{f.content}</p>
            {f.reply && (
              <div className="rounded-lg border border-primary/10 bg-primary/[0.03] p-3 text-sm">
                <p className="mb-1 text-xs font-medium text-primary">已回复</p>
                <p className="whitespace-pre-wrap">{f.reply}</p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">状态：</span>
              <Button
                size="sm"
                variant={f.status === "pending" ? "default" : "outline"}
                disabled={pending}
                onClick={() => setStatus(f.id, "pending")}
              >
                {statusLabels.pending}
              </Button>
              <Button
                size="sm"
                variant={f.status === "processing" ? "default" : "outline"}
                disabled={pending}
                onClick={() => setStatus(f.id, "processing")}
              >
                {statusLabels.processing}
              </Button>
              <Button
                size="sm"
                variant={f.status === "done" ? "default" : "outline"}
                disabled={pending}
                onClick={() => setStatus(f.id, "done")}
              >
                {statusLabels.done}
              </Button>
              {replying === f.id ? (
                <div className="flex w-full flex-col gap-2 sm:flex-row">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                    placeholder="回复内容（提交后通知用户）"
                    className="flex-1"
                  />
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => sendReply(f.id)} disabled={pending}>
                      发送回复
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setReplying(null)}>
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => setReplying(f.id)}>
                  回复
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
