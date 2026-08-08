"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Markdown } from "@/components/markdown"

type AnnouncementItem = {
  id: string
  title: string
  createdAt: string
  pinnedAt: string | null
}

type ChangelogStatus = {
  latest: { version: string; date: string; body: string } | null
  alreadyPublished: boolean
}

// 公告管理：从更新日志发布 / 手动写公告（MD + 实时预览）/ 置顶 / 删除
export function AnnouncementManager({ initialAnnouncements }: { initialAnnouncements: AnnouncementItem[] }) {
  const router = useRouter()
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [status, setStatus] = useState<ChangelogStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [publishingChangelog, setPublishingChangelog] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [pinned, setPinned] = useState(false)
  const [publishingManual, setPublishingManual] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    import("@/lib/actions/announcement")
      .then(({ getChangelogStatus }) => getChangelogStatus())
      .then((r) => {
        if (cancelled) return
        setStatus(r?.latest ? r : { latest: null, alreadyPublished: true })
        setLoadingStatus(false)
      })
      .catch(() => {
        if (!cancelled) {
          setStatus({ latest: null, alreadyPublished: true })
          setLoadingStatus(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function publishFromChangelog() {
    setPublishingChangelog(true)
    setMsg(null)
    const { publishChangelogAnnouncement } = await import("@/lib/actions/announcement")
    const result = await publishChangelogAnnouncement()
    if (result?.error) {
      setMsg(result.error)
    } else {
      setMsg(`已发布版本 ${result.version} 公告`)
      setStatus((s) => (s ? { ...s, alreadyPublished: true } : s))
      router.refresh()
    }
    setPublishingChangelog(false)
  }

  async function publishManual() {
    if (!title.trim() || !content.trim()) {
      setMsg("请填写标题和内容")
      return
    }
    setPublishingManual(true)
    setMsg(null)
    const formData = new FormData()
    formData.set("title", title)
    formData.set("content", content)
    if (pinned) formData.set("pinned", "on")
    const { publishAnnouncement } = await import("@/lib/actions/announcement")
    const result = await publishAnnouncement(formData)
    if (result?.error) {
      setMsg(result.error)
    } else {
      setMsg("公告已发布")
      setTitle("")
      setContent("")
      setPinned(false)
      setManualOpen(false)
      router.refresh()
    }
    setPublishingManual(false)
  }

  async function togglePin(id: string) {
    const { togglePinAnnouncement } = await import("@/lib/actions/announcement")
    await togglePinAnnouncement(id)
    router.refresh()
  }

  async function remove(id: string) {
    if (!window.confirm("确定要删除这条公告吗？")) return
    const { deleteAnnouncement } = await import("@/lib/actions/announcement")
    await deleteAnnouncement(id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* 从更新日志发布 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">从更新日志发布版本公告</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {loadingStatus
                  ? "读取中..."
                  : status?.latest
                    ? `最新版本：${status.latest.version}（${status.latest.date}）${status.alreadyPublished ? "· 已发布" : "· 未发布"}`
                    : "未找到版本信息"}
              </p>
            </div>
            <Button
              size="sm"
              onClick={publishFromChangelog}
              disabled={loadingStatus || !status?.latest || status.alreadyPublished || publishingChangelog}
            >
              {publishingChangelog ? "发布中..." : status?.latest && !status.alreadyPublished ? `发布 ${status.latest.version}` : "已是最新"}
            </Button>
          </div>
          {status?.latest && !status.alreadyPublished && (
            <div className="mt-3 rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">预览</p>
              <Markdown content={status.latest.body} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 手动写公告 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">写公告</p>
            <Button variant="outline" size="sm" onClick={() => setManualOpen((v) => !v)}>
              {manualOpen ? "收起" : "写公告"}
            </Button>
          </div>
          {manualOpen && (
            <div className="mt-3 space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="公告标题"
                maxLength={100}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={"支持 Markdown 格式：\n# 标题 / **加粗** / - 列表 / > 引用 / ```代码``` 等"}
                  rows={10}
                  className="w-full resize-y rounded-md border bg-background px-3 py-1.5 text-sm leading-relaxed"
                />
                <div className="max-h-72 overflow-y-auto rounded-md border bg-muted/20 p-3">
                  {content.trim() ? <Markdown content={content} /> : <p className="text-xs text-muted-foreground">实时预览</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-primary" />
                  置顶（公告筛选时排最前）
                </label>
                <Button size="sm" onClick={publishManual} disabled={publishingManual}>
                  {publishingManual ? "发布中..." : "发布公告"}
                </Button>
                {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 已发布公告 */}
      {announcements.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">已发布公告（{announcements.length}）</p>
          {announcements.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <Badge variant={a.pinnedAt ? "default" : "secondary"} className="shrink-0 text-xs">
                {a.pinnedAt ? "📌 置顶" : "公告"}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-sm">{a.title}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
              </span>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => togglePin(a.id)}>
                {a.pinnedAt ? "取消置顶" : "置顶"}
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => remove(a.id)}>
                删除
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
