import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { searchManga, fetchPopularManga, COMIC_SOURCES, DEFAULT_SOURCE_ID } from "@/lib/suwayomi"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

export default async function ComicsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; source?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { q, page, source } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? "1") || 1)
  const selectedSource = COMIC_SOURCES.find((s) => s.id === source)?.id ?? DEFAULT_SOURCE_ID
  let result: { mangas: Array<any>; hasNextPage: boolean } | null = null
  let error = ""

  if (q) {
    try {
      result = await searchManga(q, currentPage, selectedSource)
    } catch (e: any) {
      error = e.message ?? "搜索失败"
    }
  } else {
    // 未搜索时默认展示热门漫画
    try {
      result = await fetchPopularManga(currentPage, selectedSource)
    } catch {
      result = null
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">漫画</h1>
        <p className="mt-1.5 text-muted-foreground">在线搜索并阅读漫画</p>
      </div>

      <form className="mb-4 flex gap-2" action="/comics">
        <Input name="q" placeholder="搜索漫画标题或作者..." defaultValue={q ?? ""} className="max-w-sm bg-background" />
        <input type="hidden" name="source" value={selectedSource} />
        <Button type="submit">搜索</Button>
      </form>

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">来源：</span>
        {COMIC_SOURCES.map((s) => (
          <Link key={s.id} href={`/comics?source=${s.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}>
            <Badge variant={selectedSource === s.id ? "default" : "secondary"} className="cursor-pointer">
              {s.name}
            </Badge>
          </Link>
        ))}
      </div>

      {error && (
        <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/10">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-base font-medium">搜索暂时不可用</p>
            <p className="mt-1 text-sm text-muted-foreground">漫画源可能暂时无法访问，请稍后重试或切换来源</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {result.mangas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-lg font-medium">{q ? "没有找到漫画" : "暂无热门漫画"}</p>
                <p className="mt-1 text-sm text-muted-foreground">尝试其他关键词或切换来源</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {result.mangas.map((m, i) => (
                <Link key={m.id} href={`/comics/${m.id}`} className="animate-lib-rise-in" style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }}>
                  <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                    <div className="flex h-56 items-center justify-center bg-muted/30">
                      {m.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/suwayomi${m.thumbnailUrl}`}
                          alt={m.title}
                          loading="lazy" decoding="async"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-4xl font-bold text-muted-foreground/30">📘</span>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm line-clamp-1">{m.title}</h3>
                      {m.author && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{m.author}</p>}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {result.mangas.length > 0 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              {currentPage > 1 && (
                <Link href={`/comics?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${currentPage - 1}&source=${selectedSource}`}>
                  <Button variant="outline" size="sm">上一页</Button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground">第 {currentPage} 页</span>
              {result.hasNextPage && (
                <Link href={`/comics?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${currentPage + 1}&source=${selectedSource}`}>
                  <Button variant="outline" size="sm">下一页</Button>
                </Link>
              )}
            </div>
          )}
        </>
      )}

      {!q && !result && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          热门漫画暂时加载失败，输入关键词搜索漫画
        </div>
      )}
    </div>
  )
}
