import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { fetchMangaChapters } from "@/lib/suwayomi"

export const dynamic = "force-dynamic"

const typeLabels: Record<string, string> = {
  BOOK: "📖 电子书",
  COMIC: "📘 漫画",
}

export default async function FavoritesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const favorites = await prisma.favoriteResource.findMany({
    where: { userId: session.user.id as string },
    include: {
      resource: {
        include: {
          uploader: { select: { username: true } },
          bindings: true,
          _count: { select: { favorites: true, recommendations: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // 漫画条目：取主源（comicMangaId）最新章节标题
  interface ShelfItem {
    id: number
    title: string
    author: string | null
    coverImage: string | null
    type: string
    comicMangaId: string | null
    comicSourceId: string | null
    latestChapter: string | null
    username: string
    favCount: number
  }
  const items: ShelfItem[] = await Promise.all(
    favorites.map(async (fav) => {
      const r = fav.resource
      let latestChapter: string | null = null
      if (r.type === "COMIC" && r.comicMangaId) {
        try {
          const chapters = await fetchMangaChapters(r.comicMangaId)
          if (chapters.length > 0) {
            latestChapter = chapters[chapters.length - 1].name
          }
        } catch {
          // 源不可用时静默
        }
      }
      return {
        id: r.id,
        title: r.title,
        author: r.author,
        coverImage: r.coverImage,
        type: r.type,
        comicMangaId: r.comicMangaId,
        comicSourceId: r.comicSourceId,
        latestChapter,
        username: r.uploader.username,
        favCount: r._count.favorites,
      }
    })
  )

  const comics = items.filter((i) => i.type === "COMIC")
  const books = items.filter((i) => i.type === "BOOK")

  function renderGrid(list: ShelfItem[]) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {list.map((item) => (
          <Link key={item.id} href={item.type === "COMIC" && item.comicMangaId ? `/comics/${item.comicMangaId}` : `/resource/${item.id}`}>
            <Card className="group overflow-hidden transition-all hover:border-primary/40 hover:shadow-md">
              <div className="relative aspect-[3/4] overflow-hidden bg-muted/30">
                {item.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-muted-foreground/30">
                    {item.type === "COMIC" ? "📘" : "📖"}
                  </div>
                )}
                <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                  {typeLabels[item.type]}
                </span>
              </div>
              <CardContent className="p-2.5">
                <p className="truncate text-sm font-medium">{item.title}</p>
                {item.type === "COMIC" && item.latestChapter ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">更新至：{item.latestChapter}</p>
                ) : (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.author ?? item.username}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">书架</h1>
      <p className="mt-1.5 text-muted-foreground">你收藏的 {favorites.length} 个资源</p>

      {favorites.length === 0 ? (
        <Card className="mt-8 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-3xl">☆</div>
            <p className="text-lg font-medium">书架还是空的</p>
            <p className="mt-1 text-sm text-muted-foreground">在漫画或资源页点击「☆ 收藏」加入书架</p>
            <Link href="/explore" className="mt-5 text-sm text-primary hover:underline">去探索 →</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-8">
          {comics.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                📘 漫画追更
                <Badge variant="secondary">{comics.length}</Badge>
              </h2>
              {renderGrid(comics)}
            </section>
          )}
          {books.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                📖 电子书
                <Badge variant="secondary">{books.length}</Badge>
              </h2>
              {renderGrid(books)}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
