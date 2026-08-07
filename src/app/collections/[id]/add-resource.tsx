"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type SearchItem = {
  id: number
  title: string
  author: string | null
  coverImage: string | null
  type: string
}

const typeLabels: Record<string, string> = {
  BOOK: "📖 电子书",
  COMIC: "📘 漫画",
}

// 目录添加条目面板：默认展示最近条目，支持关键词搜索、多选批量加入
export function AddResourceToCollection({
  collectionId,
  existingIds,
}: {
  collectionId: string
  existingIds: number[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [items, setItems] = useState<SearchItem[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const existingSet = new Set(existingIds)

  async function load(query: string) {
    setSearching(true)
    setMsg(null)
    try {
      const { searchResources } = await import("@/lib/actions/collection")
      const result = await searchResources(query)
      if (result?.resources) {
        setItems(result.resources)
        setSelected(new Set())
      } else if (result?.error) {
        setMsg(result.error)
      }
    } finally {
      setSearching(false)
    }
  }

  function toggleOpen() {
    const next = !open
    setOpen(next)
    if (next && items === null) load("")
  }

  function toggleSelect(id: number) {
    if (existingSet.has(id)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleAdd() {
    if (selected.size === 0) return
    setAdding(true)
    setMsg(null)
    try {
      const { addResourcesToCollection } = await import("@/lib/actions/collection")
      const result = await addResourcesToCollection(collectionId, [...selected])
      if (result?.error) {
        setMsg(result.error)
      } else {
        setMsg(`已加入 ${result.added} 个条目${result?.skipped && result.skipped > 0 ? `（${result.skipped} 个已在目录中）` : ""}`)
        setSelected(new Set())
        router.refresh()
        load(q)
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <div>
      <Button variant="outline" size="sm" onClick={toggleOpen}>
        ＋ 添加条目
      </Button>
      <div className="lib-collapse" data-open={open}>
        <div>
          <div className="mt-3 rounded-lg border p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  load(q)
                }
              }}
              placeholder="搜索标题或作者（留空显示最近条目）"
              className="min-w-0 flex-1 rounded-md border bg-background px-3 py-1.5 text-sm"
            />
            <Button variant="outline" size="sm" onClick={() => load(q)} disabled={searching}>
              {searching ? "搜索中..." : "搜索"}
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            勾选条目后批量加入，留空搜索显示最近更新的条目
          </p>

          <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
            {items === null ? null : items.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">没有找到条目</p>
            ) : (
              items.map((r) => {
                const disabled = existingSet.has(r.id)
                const checked = selected.has(r.id)
                return (
                  <label
                    key={r.id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors ${
                      disabled ? "cursor-not-allowed opacity-50" : "hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleSelect(r.id)}
                      className="accent-primary"
                    />
                    {r.coverImage ? (
                      <img src={r.coverImage} alt="" className="h-9 w-6 shrink-0 rounded object-contain bg-muted/30" />
                    ) : (
                      <span className="flex h-9 w-6 shrink-0 items-center justify-center rounded bg-muted/30 text-xs">
                        {typeLabels[r.type]?.slice(0, 1)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm">{r.title}</span>
                    {r.author && <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{r.author}</span>}
                    {disabled ? (
                      <Badge variant="secondary" className="shrink-0 text-xs">已在目录</Badge>
                    ) : (
                      <Badge variant="outline" className="hidden shrink-0 text-xs sm:inline">{typeLabels[r.type] ?? r.type}</Badge>
                    )}
                  </label>
                )
              })
            )}
          </div>

          <div className="mt-2 flex items-center gap-2 border-t pt-2">
            <Button size="sm" onClick={handleAdd} disabled={selected.size === 0 || adding}>
              {adding ? "加入中..." : `加入所选（${selected.size}）`}
            </Button>
            {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
