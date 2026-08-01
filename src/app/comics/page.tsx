import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { searchManga } from "@/lib/suwayomi"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function ComicsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { q, page } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? "1") || 1)
  let result: { mangas: Array<any>; hasNextPage: boolean } | null = null
  let error = ""

  if (q) {
    try {
      result = await searchManga(q, currentPage)
    } catch (e: any) {
      error = e.message ?? "搜索失败"
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">漫画</h1>
        <p className="mt-1.5 text-muted-foreground">在线搜索并阅读漫画（来源：再漫画）</p>
      </div>

      <form className="mb-6 flex gap-2" action="/comics">
        <Input name="q" placeholder="搜索漫画标题或作者..." defaultValue={q ?? ""} className="max-w-sm bg-background" />
        <Button type="submit">搜索</Button>
      </form>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {q && result && (
        <>
          {result.mangas.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-lg font-medium">没有找到漫画</p>
                <p className="mt-1 text-sm text-muted-foreground">尝试其他关键词</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {result.mangas.map((m) => (
                <Link key={m.id} href={`/comics/${m.id}`}>
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
                <Link href={`/comics?q=${encodeURIComponent(q)}&page=${currentPage - 1}`}>
                  <Button variant="outline" size="sm">上一页</Button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground">第 {currentPage} 页</span>
              {result.hasNextPage && (
                <Link href={`/comics?q=${encodeURIComponent(q)}&page=${currentPage + 1}`}>
                  <Button variant="outline" size="sm">下一页</Button>
                </Link>
              )}
            </div>
          )}
        </>
      )}

      {!q && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          输入关键词搜索漫画
        </div>
      )}
    </div>
  )
}
