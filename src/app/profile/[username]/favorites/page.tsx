import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const PAGE_SIZE = 24

export default async function UserFavoritesPage({
  params, searchParams,
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { username } = await params
  const { page } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? "1") || 1)

  const user = await prisma.user.findUnique({ where: { username: decodeURIComponent(username) }, select: { id: true, username: true } })
  if (!user) notFound()

  const [favs, total] = await Promise.all([
    prisma.favoriteCollection.findMany({
      where: { userId: user.id }, orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { collection: { include: { creator: { select: { username: true } }, _count: { select: { resources: true, favorites: true } } } } },
    }),
    prisma.favoriteCollection.count({ where: { userId: user.id } }),
  ])
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <Link href={`/profile/${user.username}`} className="text-sm text-muted-foreground hover:underline">← 回到 {user.username} 的主页</Link>
      <div className="mt-4 mb-8"><h1 className="text-3xl font-bold tracking-tight">{user.username} 收藏的目录 ({total})</h1></div>
      {favs.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">还没有收藏</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {favs.map((fav, i) => (
              <Link key={fav.id} href={`/collections/${fav.collection.id}`} className="animate-lib-rise-in" style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }}><Card className="h-full transition-shadow hover:shadow-md"><CardContent className="p-4"><h3 className="font-medium">{fav.collection.title}</h3><div className="mt-2 flex gap-2 text-xs text-muted-foreground"><span>{fav.collection.creator.username}</span><span>·</span><span>{fav.collection._count.resources} 资源</span><span>·</span><span>{fav.collection._count.favorites} 收藏</span></div></CardContent></Card></Link>
            ))}
          </div>
          {totalPages > 1 && <Pagination path={`/profile/${user.username}/favorites`} page={currentPage} total={totalPages} />}
        </>
      )}
    </div>
  )
}

function Pagination({ path, page, total }: { path: string; page: number; total: number }) {
  return (
    <div className="mt-8 flex items-center justify-center gap-4">
      {page > 1 && <Link href={`${path}?page=${page - 1}`}><Button variant="outline" size="sm">上一页</Button></Link>}
      <span className="text-sm text-muted-foreground">{page} / {total}</span>
      {page < total && <Link href={`${path}?page=${page + 1}`}><Button variant="outline" size="sm">下一页</Button></Link>}
    </div>
  )
}
