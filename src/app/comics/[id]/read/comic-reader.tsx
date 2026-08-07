"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface ChapterOption {
  id: string
  name: string
}

interface ReaderPage {
  index: number
  url: string
}

interface SourceOption {
  mangaId: string
  name: string
}

type ReaderMode = "scroll" | "page"

const MODE_KEY = "comic-reader-mode"

export function ComicReader({
  mangaId,
  mangaTitle,
  sources = [],
  chapters,
  activeIndex,
  pages,
  startFromEnd = false,
}: {
  mangaId: string
  mangaTitle: string
  sources?: SourceOption[]
  chapters: ChapterOption[]
  activeIndex: number
  pages: ReaderPage[]
  startFromEnd?: boolean
}) {
  const router = useRouter()
  const [loaded, setLoaded] = useState<Set<number>>(new Set())
  const [showChapters, setShowChapters] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const [mode, setMode] = useState<ReaderMode>("scroll")
  const [pageIndex, setPageIndex] = useState(0)
  const [immersive, setImmersive] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  // 章节切换首帧守卫：切章瞬间 pageIndex 还是旧章节的值，跳过保存防止污染目标章节进度
  const chapterRef = useRef<string | undefined>(undefined)

  const chapter = chapters[activeIndex]
  const prevChapter = activeIndex > 0 ? chapters[activeIndex - 1] : null
  const nextChapter = activeIndex < chapters.length - 1 ? chapters[activeIndex + 1] : null
  const totalPages = pages.length

  function toggleImmersive() {
    setImmersive((v) => !v)
    setShowChapters(false)
    setShowSources(false)
  }

  function switchSource(s: SourceOption) {
    if (s.mangaId === mangaId) return
    router.push(`/comics/${s.mangaId}/read`)
  }

  // 章节切换时重置阅读位置（新章节从开头开始；startFromEnd 时从末尾开始）
  useEffect(() => {
    setLoaded(new Set())
    if (startFromEnd) {
      if (totalPages > 0) {
        setPageIndex(totalPages - 1)
      }
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight
      }
    } else {
      setPageIndex(0)
      if (containerRef.current) containerRef.current.scrollTop = 0
    }
  }, [chapter.id, startFromEnd, totalPages])

  // Load reading mode preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY)
      if (saved === "page" || saved === "scroll") setMode(saved)
    } catch {}
  }, [])

  // Save progress to server (debounced)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveProgress = useCallback((value: string) => {
    const key = `comic-progress-${mangaId}-${chapter.id}`
    try { localStorage.setItem(key, value) } catch {}
  }, [mangaId, chapter.id])

  const saveToServer = useCallback((pIndex: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch("/api/comic-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mangaId,
          mangaTitle,
          chapterId: chapter.id,
          chapterName: chapter.name,
          pageIndex: pIndex,
          totalPages,
        }),
      }).catch(() => {})
    }, 500)
  }, [mangaId, mangaTitle, chapter.id, chapter.name, totalPages])

  // Restore progress from server on chapter change
  useEffect(() => {
    if (startFromEnd) return
    let cancelled = false
    fetch(`/api/comic-progress?mangaId=${mangaId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.history) return
        const h = d.history
        // If the server has a more recent chapter than the current one and
        // no chapter was explicitly requested, jump to the saved chapter.
        if (h.chapterId && String(h.chapterId) !== String(chapter.id) && !window.location.search.includes("chapter=")) {
          window.location.href = `/comics/${mangaId}/read?chapter=${h.chapterId}`
          return
        }
        // Restore page position for the current chapter
        if (String(h.chapterId) === String(chapter.id)) {
          if (h.pageIndex > 0 && h.pageIndex < totalPages) {
            setPageIndex(h.pageIndex)
          }
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mangaId, chapter.id, totalPages, startFromEnd])

  // Save page progress when flipping in page mode
  useEffect(() => {
    // 切章首帧：pageIndex 还是旧章节的值，跳过保存（防止污染目标章节进度）
    if (chapterRef.current !== chapter.id) {
      chapterRef.current = chapter.id
      return
    }
    if (mode === "page") {
      saveProgress(String(pageIndex))
      saveToServer(pageIndex)
    }
  }, [pageIndex, mode, saveProgress, saveToServer, chapter.id])

  // Save chapter entry progress on mount (scroll mode starts at chapter start)
  useEffect(() => {
    if (mode === "scroll") saveToServer(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter.id])

  // Save reading mode preference
  function switchMode(m: ReaderMode) {
    setMode(m)
    try { localStorage.setItem(MODE_KEY, m) } catch {}
  }

  // Restore progress
  useEffect(() => {
    if (startFromEnd) return
    const key = `comic-progress-${mangaId}-${chapter.id}`
    try {
      const saved = localStorage.getItem(key)
      if (!saved) return
      if (mode === "scroll") {
        if (containerRef.current) containerRef.current.scrollTop = parseInt(saved, 10)
      } else {
        const p = parseInt(saved, 10)
        if (!isNaN(p) && p >= 0 && p < totalPages) setPageIndex(p)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mangaId, chapter.id, mode, startFromEnd])

  // Save progress (debounced for scroll, immediate for page)
  const onScroll = useCallback(() => {
    if (!containerRef.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const el = containerRef.current
      if (!el) return
      saveProgress(String(el.scrollTop))
      // 粗略估算当前页数（scrollTop / 内容高度 * 总页数）用于服务器记录
      if (el.scrollHeight > 0) {
        const ratio = el.scrollTop / (el.scrollHeight - window.innerHeight)
        const pIndex = Math.min(totalPages - 1, Math.max(0, Math.round(ratio * totalPages)))
        saveToServer(pIndex)
      }
    }, 800)
  }, [saveProgress, saveToServer, totalPages])

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setImmersive(false)
        return
      }
      if (e.key === "i" || e.key === "I" || e.key === "f" || e.key === "F") {
        setImmersive((v) => !v)
        return
      }
      if (mode === "scroll") {
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          if (containerRef.current) containerRef.current.scrollTop -= window.innerHeight * 0.8
        } else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
          e.preventDefault()
          if (containerRef.current) containerRef.current.scrollTop += window.innerHeight * 0.8
        } else if (e.key === "Home") {
          if (containerRef.current) containerRef.current.scrollTop = 0
        } else if (e.key === "End") {
          if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight
        }
      } else {
        if (e.key === "ArrowLeft") {
          setPageIndex((i) => Math.max(0, i - 1))
        } else if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
          e.preventDefault()
          setPageIndex((i) => Math.min(totalPages - 1, i + 1))
        } else if (e.key === "Home") {
          setPageIndex(0)
        } else if (e.key === "End") {
          setPageIndex(totalPages - 1)
        }
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [mode, totalPages])

  // Close chapter/source list on scroll
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const close = () => { setShowChapters(false); setShowSources(false) }
    el.addEventListener("scroll", close)
    return () => el.removeEventListener("scroll", close)
  }, [])

  // Click zones for page mode: left 30% = prev, right 30% = next, middle = immersive toggle
  function handleClickZone(e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== "page") return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x < rect.width * 0.3) {
      setPageIndex((i) => Math.max(0, i - 1))
    } else if (x > rect.width * 0.7) {
      setPageIndex((i) => Math.min(totalPages - 1, i + 1))
    } else {
      toggleImmersive()
    }
  }

  // Click middle area in scroll mode to toggle immersive
  function handleScrollClick(e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== "scroll" || immersive === false) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x > rect.width * 0.3 && x < rect.width * 0.7) {
      toggleImmersive()
    }
  }

  function goToChapter(c: ChapterOption) {
    router.push(`/comics/${mangaId}/read?chapter=${c.id}`)
    setShowChapters(false)
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      {!immersive && (
      <header className="animate-lib-fade-in sticky top-0 z-40 flex h-12 items-center justify-between border-b border-white/10 bg-black/90 px-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <Link href={`/comics/${mangaId}`} className="shrink-0 text-white/70 transition-colors hover:text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </Link>
          <span className="truncate text-sm font-medium text-white">{mangaTitle}</span>
          {mode === "page" && (
            <span className="shrink-0 text-xs text-white/50 tabular-nums">
              {pageIndex + 1}/{totalPages}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={toggleImmersive}
            title="沉浸阅读（快捷键 i / f，Esc 退出）"
          >
            ⛶ 沉浸
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={() => switchMode(mode === "scroll" ? "page" : "scroll")}
            title={mode === "scroll" ? "切换到左右翻页" : "切换到上下滚动"}
          >
            {mode === "scroll" ? "⇋ 翻页" : "⇅ 滚动"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={() => setShowChapters((v) => { if (!v) setShowSources(false); return !v })}
          >
            章节
          </Button>
          {sources.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
              onClick={() => setShowSources((v) => { if (!v) setShowChapters(false); return !v })}
              title="切换漫画源"
            >
              源
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={() => router.push(`/comics/${mangaId}`)}
            title="退出阅读"
          >
            ✕ 退出
          </Button>
        </div>
      </header>
      )}

      {/* Chapter selector */}
      {showChapters && !immersive && (
        <div className="absolute left-0 right-0 top-12 z-50 max-h-[60vh] overflow-y-auto border-b border-white/10 bg-zinc-900/95 backdrop-blur">
          <div className="grid gap-1 p-2 sm:grid-cols-2">
            {chapters.map((c, i) => (
              <button
                key={c.id}
                onClick={() => goToChapter(c)}
                className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  i === activeIndex
                    ? "bg-primary text-primary-foreground"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Source selector */}
      {showSources && !immersive && (
        <div className="absolute left-0 right-0 top-12 z-50 border-b border-white/10 bg-zinc-900/95 backdrop-blur">
          <div className="flex flex-wrap gap-1 p-2">
            {sources.map((s) => (
              <button
                key={s.mangaId}
                onClick={() => switchSource(s)}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  s.mangaId === mangaId
                    ? "bg-primary text-primary-foreground"
                    : "text-white/80 hover:bg-white/10"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pages */}
      {mode === "scroll" ? (
        <div ref={containerRef} onScroll={onScroll} onClick={handleScrollClick} className="flex-1 overflow-y-auto overscroll-contain bg-black">
          {pages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-white/80">章节图片加载失败</p>
              <p className="text-sm text-white/50">
                可能需要漫画源账号登录后才能阅读，或源站暂时不可用
              </p>
              <Link href={`/comics/${mangaId}`}>
                <Button variant="outline" size="sm" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                  返回详情页
                </Button>
              </Link>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              {!immersive && (
                <div className="py-4 text-center text-sm text-white/60">{chapter.name}</div>
              )}
              {pages.map((p) => (
                <div key={p.index} className="relative w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={`第 ${p.index + 1} 页`}
                    loading={p.index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="block w-full"
                    onLoad={() => setLoaded((prev) => new Set(prev).add(p.index))}
                  />
                  {!loaded.has(p.index) && (
                    <div className="flex h-40 items-center justify-center text-white/30">加载中...</div>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between gap-2 px-4 py-6">
                {prevChapter ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 bg-transparent text-white hover:bg-white/10"
                    onClick={() => router.push(`/comics/${mangaId}/read?chapter=${prevChapter.id}&end=1`)}
                  >
                    上一章
                  </Button>
                ) : <span />}
                {nextChapter ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 bg-transparent text-white hover:bg-white/10"
                    onClick={() => router.push(`/comics/${mangaId}/read?chapter=${nextChapter.id}`)}
                  >
                    下一章
                  </Button>
                ) : <span />}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex flex-1 items-center justify-center overflow-hidden bg-black select-none"
          onClick={handleClickZone}
        >
          {totalPages === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-white/80">章节图片加载失败</p>
              <p className="text-sm text-white/50">
                可能需要漫画源账号登录后才能阅读，或源站暂时不可用
              </p>
              <Link href={`/comics/${mangaId}`}>
                <Button variant="outline" size="sm" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                  返回详情页
                </Button>
              </Link>
            </div>
          ) : (
            <div className="relative flex h-full w-full items-center justify-center">
              {/* Page image：保留全部图片预加载，当前页用 opacity 过渡淡入淡出 */}
              {pages.map((p) => (
                <div
                  key={p.index}
                  className={`transition-opacity duration-200 ${
                    p.index === pageIndex ? "opacity-100" : "pointer-events-none invisible opacity-0"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={`第 ${p.index + 1} 页`}
                    decoding="async"
                    className="max-h-screen w-auto max-w-full object-contain"
                    onLoad={() => setLoaded((prev) => new Set(prev).add(p.index))}
                  />
                </div>
              ))}

              {/* Chapter name + page label */}
              {!immersive && (
                <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white/70">
                  {chapter.name} · {pageIndex + 1}/{totalPages}
                </div>
              )}

              {/* Click zone hints */}
              {!immersive && (
                <>
                <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/5 p-2 text-white/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </div>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/5 p-2 text-white/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
                </>
              )}

              {/* Bottom navigation */}
              {!immersive && (
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-black/60 text-white hover:bg-white/10"
                  disabled={pageIndex === 0}
                  onClick={(e) => { e.stopPropagation(); setPageIndex((i) => Math.max(0, i - 1)) }}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 bg-black/60 text-white hover:bg-white/10"
                  disabled={pageIndex >= totalPages - 1}
                  onClick={(e) => { e.stopPropagation(); setPageIndex((i) => Math.min(totalPages - 1, i + 1)) }}
                >
                  下一页
                </Button>
              </div>
              )}

              {/* Chapter transition buttons when at boundaries */}
              {pageIndex === 0 && prevChapter && (
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-white/30 bg-black/70 text-white hover:bg-white/10"
                  onClick={(e) => { e.stopPropagation(); router.push(`/comics/${mangaId}/read?chapter=${prevChapter.id}&end=1`) }}
                >
                  上一章
                </Button>
              )}
              {pageIndex >= totalPages - 1 && nextChapter && (
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-white/30 bg-black/70 text-white hover:bg-white/10"
                  onClick={(e) => { e.stopPropagation(); router.push(`/comics/${mangaId}/read?chapter=${nextChapter.id}`) }}
                >
                  下一章
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
