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

type ReaderMode = "scroll" | "page"

const MODE_KEY = "comic-reader-mode"

export function ComicReader({
  mangaId,
  mangaTitle,
  chapters,
  activeIndex,
  pages,
}: {
  mangaId: string
  mangaTitle: string
  chapters: ChapterOption[]
  activeIndex: number
  pages: ReaderPage[]
}) {
  const router = useRouter()
  const [loaded, setLoaded] = useState<Set<number>>(new Set())
  const [showChapters, setShowChapters] = useState(false)
  const [mode, setMode] = useState<ReaderMode>("scroll")
  const [pageIndex, setPageIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const chapter = chapters[activeIndex]
  const prevChapter = activeIndex > 0 ? chapters[activeIndex - 1] : null
  const nextChapter = activeIndex < chapters.length - 1 ? chapters[activeIndex + 1] : null
  const totalPages = pages.length

  // Load reading mode preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY)
      if (saved === "page" || saved === "scroll") setMode(saved)
    } catch {}
  }, [])

  // Save reading mode preference
  function switchMode(m: ReaderMode) {
    setMode(m)
    try { localStorage.setItem(MODE_KEY, m) } catch {}
  }

  // Restore progress
  useEffect(() => {
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
  }, [mangaId, chapter.id, mode])

  // Save progress (debounced for scroll, immediate for page)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveProgress = useCallback((value: string) => {
    const key = `comic-progress-${mangaId}-${chapter.id}`
    try { localStorage.setItem(key, value) } catch {}
  }, [mangaId, chapter.id])

  const onScroll = useCallback(() => {
    if (!containerRef.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveProgress(String(containerRef.current?.scrollTop ?? 0))
    }, 300)
  }, [saveProgress])

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
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

  // Save page progress when flipping in page mode
  useEffect(() => {
    if (mode === "page") saveProgress(String(pageIndex))
  }, [pageIndex, mode, saveProgress])

  // Close chapter list on scroll
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const close = () => setShowChapters(false)
    el.addEventListener("scroll", close)
    return () => el.removeEventListener("scroll", close)
  }, [])

  // Click zones for page mode: left 30% = prev, right 30% = next
  function handleClickZone(e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== "page") return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    if (x < rect.width * 0.3) {
      setPageIndex((i) => Math.max(0, i - 1))
    } else if (x > rect.width * 0.7) {
      setPageIndex((i) => Math.min(totalPages - 1, i + 1))
    }
  }

  function goToChapter(c: ChapterOption) {
    router.push(`/comics/${mangaId}/read?chapter=${c.id}`)
    setShowChapters(false)
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-white/10 bg-black/90 px-3 backdrop-blur">
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
            onClick={() => switchMode(mode === "scroll" ? "page" : "scroll")}
            title={mode === "scroll" ? "切换到左右翻页" : "切换到上下滚动"}
          >
            {mode === "scroll" ? "⇋ 翻页" : "⇅ 滚动"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={() => setShowChapters((v) => !v)}
          >
            章节
          </Button>
        </div>
      </header>

      {/* Chapter selector */}
      {showChapters && (
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

      {/* Pages */}
      {mode === "scroll" ? (
        <div ref={containerRef} onScroll={onScroll} className="flex-1 overflow-y-auto overscroll-contain bg-black">
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
              <div className="py-4 text-center text-sm text-white/60">{chapter.name}</div>
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
                    onClick={() => router.push(`/comics/${mangaId}/read?chapter=${prevChapter.id}`)}
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
              {/* Page image */}
              {pages.map((p) => (
                <div key={p.index} className={p.index === pageIndex ? "block" : "hidden"}>
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
              <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white/70">
                {chapter.name} · {pageIndex + 1}/{totalPages}
              </div>

              {/* Click zone hints */}
              <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/5 p-2 text-white/30">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </div>
              <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/5 p-2 text-white/30">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </div>

              {/* Bottom navigation */}
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

              {/* Chapter transition buttons when at boundaries */}
              {pageIndex === 0 && prevChapter && (
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-white/30 bg-black/70 text-white hover:bg-white/10"
                  onClick={(e) => { e.stopPropagation(); router.push(`/comics/${mangaId}/read?chapter=${prevChapter.id}`) }}
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
