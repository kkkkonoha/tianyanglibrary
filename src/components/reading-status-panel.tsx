"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/toast"
import { setReadingStatus } from "@/lib/reading-status"
import { READING_STATUS_LABELS } from "@/lib/reading-status-constants"

type StatusValue = keyof typeof READING_STATUS_LABELS

type Review = {
  id: string
  status: StatusValue
  note: string | null
  updatedAt: Date | string
  user: { id: string; username: string; avatar: string | null }
}

export function ReadingStatusPanel({
  resourceId,
  current,
  reviews,
  currentUserId,
}: {
  resourceId: number
  current: { status: StatusValue; note: string | null } | null
  reviews: Review[]
  currentUserId?: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<StatusValue>(current?.status ?? "WANT")
  const [note, setNote] = useState(current?.note ?? "")
  const [editing, setEditing] = useState(!current)

  function save() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set("resourceId", String(resourceId))
      formData.set("status", status)
      formData.set("note", note)
      const result = await setReadingStatus(formData)
      if (result.error) {
        toast(result.error, "error")
        return
      }
      setEditing(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {currentUserId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">阅读状态</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(READING_STATUS_LABELS) as StatusValue[]).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={status === value ? "default" : "outline"}
                  onClick={() => { setStatus(value); setEditing(true) }}
                >
                  {READING_STATUS_LABELS[value]}
                </Button>
              ))}
            </div>
            {editing ? (
              <>
                <AutoResizeTextarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="短评（可选，保存后会同步显示在动态和讨论版）"
                  minRows={3}
                  maxHeight={240}
                  maxLength={500}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={save} disabled={pending}>
                    {pending ? "保存中…" : current ? "保存修改" : "保存状态"}
                  </Button>
                  {current && (
                    <Button type="button" size="sm" variant="outline" onClick={() => { setStatus(current.status); setNote(current.note ?? ""); setEditing(false) }}>
                      取消
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">当前：{READING_STATUS_LABELS[status]}</p>
                  {note && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{note}</p>}
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>编辑</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">讨论版</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有用户留下阅读短评</p>
          ) : reviews.map((review) => (
            <div key={review.id} className="flex items-start gap-2 border-b pb-3 last:border-0 last:pb-0">
              <Link href={`/profile/${review.user.username}`}>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={review.user.avatar ?? undefined} />
                  <AvatarFallback className="text-xs">{review.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Link href={`/profile/${review.user.username}`} className="font-medium hover:underline">{review.user.username}</Link>
                  <span className="text-muted-foreground">{READING_STATUS_LABELS[review.status]}</span>
                  <span className="text-muted-foreground/60">{new Date(review.updatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{review.note}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
