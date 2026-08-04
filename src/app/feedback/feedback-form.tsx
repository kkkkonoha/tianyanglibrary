"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const statusLabels: Record<string, string> = {
  pending: "待处理",
  processing: "处理中",
  done: "已处理",
}
const statusVariants: Record<string, "secondary" | "default" | "outline"> = {
  pending: "secondary",
  processing: "default",
  done: "outline",
}

export function FeedbackForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // 提交后轮询「最新反馈」接口确认服务器是否收到（响应异常不影响判定）
  async function confirmReceived(title: string, content: string): Promise<boolean> {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 400))
      try {
        const res = await fetch("/api/my-feedback/latest", { cache: "no-store" })
        if (!res.ok) continue
        const data = await res.json()
        const latest = data?.latest
        if (latest && latest.title === title && latest.content === content) {
          return true
        }
      } catch {
        // 继续轮询
      }
    }
    return false
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsg(null)
    const formData = new FormData(e.currentTarget)
    const title = (formData.get("title") as string)?.trim() ?? ""
    const content = (formData.get("content") as string)?.trim() ?? ""

    startTransition(async () => {
      try {
        const { submitFeedback } = await import("@/lib/actions/feedback")
        await submitFeedback(formData)
      } catch {
        // 响应可能中断，忽略，用轮询确认结果
      }

      const received = await confirmReceived(title, content)
      if (received) {
        setMsg({ text: "反馈已提交，可以在下方查看处理进度", ok: true })
      } else {
        setMsg({ text: "提交未能确认，请刷新页面查看是否已提交", ok: false })
      }
      router.refresh()
    })
  }
          <div>
            <Label htmlFor="type">类型</Label>
            <div className="mt-1 flex gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                <input type="radio" name="type" value="BUG" defaultChecked className="accent-primary" />
                🐞 Bug 反馈
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                <input type="radio" name="type" value="FEATURE" className="accent-primary" />
                ✨ 功能需求
              </label>
            </div>
          </div>
          <div>
            <Label htmlFor="title">标题</Label>
            <Input id="title" name="title" type="text" placeholder="一句话概括" required maxLength={100} />
          </div>
          <div>
            <Label htmlFor="content">详细描述</Label>
            <Textarea id="content" name="content" rows={4} placeholder="描述遇到的问题或想要的功能..." required />
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "提交中..." : "提交反馈"}
          </Button>
          {msg && (
            <p className={`text-sm ${msg.ok ? "text-green-600" : "text-destructive"}`}>{msg.text}</p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}

export function FeedbackList({
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
  }>
}) {
  if (feedbacks.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          还没有提交过反馈
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {feedbacks.map((f) => (
        <Card key={f.id}>
          <CardContent className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={f.type === "BUG" ? "destructive" : "default"}>
                {f.type === "BUG" ? "🐞 Bug" : "✨ 需求"}
              </Badge>
              <span className="font-medium">{f.title}</span>
              <span className="ml-auto">
                <Badge variant={statusVariants[f.status] ?? "secondary"}>{statusLabels[f.status] ?? f.status}</Badge>
              </span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{f.content}</p>
            <p className="text-xs text-muted-foreground/60">
              {new Date(f.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
            </p>
            {f.reply && (
              <div className="rounded-lg border border-primary/10 bg-primary/[0.03] p-3 text-sm">
                <p className="mb-1 text-xs font-medium text-primary">管理员回复</p>
                <p className="whitespace-pre-wrap">{f.reply}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
