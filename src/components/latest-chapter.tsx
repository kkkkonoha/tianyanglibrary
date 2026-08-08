"use client"

import { useEffect, useState } from "react"

// 书架漫画卡片：「更新至」异步填充（不阻塞页面渲染），10 分钟内存缓存由服务端处理
export function LatestChapter({ mangaId }: { mangaId: string }) {
  const [chapter, setChapter] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/comic-latest-chapter?mangaId=${encodeURIComponent(mangaId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.latestChapter) setChapter(d.latestChapter)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [mangaId])

  if (!chapter) return null
  return <p className="mt-0.5 truncate text-xs text-muted-foreground">更新至：{chapter}</p>
}
