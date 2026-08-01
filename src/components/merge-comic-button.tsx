"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

// 手动合并漫画条目：把另一个条目合并进当前条目（源绑定/评论/推荐等全部转移）
export function MergeComicButton({ resourceId }: { resourceId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [sourceId, setSourceId] = useState("")
  const [pending, startTransition] = useTransition()

  function handleMerge() {
    let id = sourceId.trim()
    if (!id) return
    const urlMatch = id.match(/\/resource\/([^/\s?]+)/)
    if (urlMatch) id = urlMatch[1]
    if (id === resourceId) {
      alert("不能合并到自身")
      return
    }
    startTransition(async () => {
      const { mergeComicResources } = await import("@/lib/actions/comic")
      const result = await mergeComicResources(resourceId, id)
      if (result?.error) {
        alert(result.error)
        return
      }
      setOpen(false)
      setSourceId("")
      alert("合并成功，已进入目标条目")
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        合并条目
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3 text-xs">
      <p className="text-muted-foreground">
        输入要合并进本条目的另一个漫画条目 ID（资源页 URL 末尾的字符串）
      </p>
      <div className="flex gap-2">
        <input
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          placeholder="条目 ID 或资源页 URL"
          className="min-w-0 flex-1 rounded-md border px-2 py-1 text-sm"
        />
        <Button size="sm" variant="destructive" disabled={pending} onClick={handleMerge}>
          {pending ? "合并中…" : "确认合并"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
          取消
        </Button>
      </div>
    </div>
  )
}
