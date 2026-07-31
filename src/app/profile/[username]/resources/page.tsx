import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const PAGE_SIZE = 24

const typeLabels: Record<string, string> = { BOOK: "📖 电子书", COMIC: "📘 漫画" }
const typeIcons: Record<string, string> = { BOOK: "BOOK", COMIC: "COMIC" }

export default async function UserResourcesPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { username } = await params
  const { page } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? "1") || 1)

  const user = await prisma.user.findUnique({ where: { username: decodeURIComponent(username) }, select: { id: true, username: true } })
  if (!user) notFound()

  const [resources, total] = await Promise.all([
    prisma.resource.findMany({
      where: { uploaderId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { tags: { include: { tag: true } }, _count: { select: { recommendations: true, comments: true } } },
    }),
    prisma.resource.count({ where: { uploaderId: user.id } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <Link href={`/profile/${user.username}`} className="text-sm text-muted-foreground hover:underline">← 回到 {user.username} 的主页</Link>
      <div className="mt-4 mb-8"><h1 className="text-3xl font-bold tracking-tight">{user.username} 的资源 ({total})</h1></div>

      {resources.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">还没有资源</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((r) => (
              <Link key={r.id} href={`/resource/${r.id}`}>
                <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                  {r.coverImage ? <img src={r.coverImage} alt={r.title} className="h-32 w-full object-contain bg-muted/30" />
                    : <div className="flex h-32 items-center justify-center bg-muted"><span className="text-3xl font-bold text-muted-foreground/30">{typeIcons[r.type]}</span></div>}
                  <CardContent className="p-3"><Badge variant="secondary" className="text-xs mb-1">{typeLabels[r.type]}</Badge><h3 className="font-medium text-sm line-clamp-1">{r.title}</h3><p className="text-xs text-muted-foreground mt-1">{r._count.recommendations} 推荐 · {r._count.comments} 评论</p></CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4">
              {currentPage > 1 && <Link href={`/profile/${user.username}/resources?page=${currentPage - 1}`}><Button variant="outline" size="sm">上一页</Button></Link>}
              <span className="text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
              {currentPage < totalPages && <Link href={`/profile/${user.username}/resources?page=${currentPage + 1}`}><Button variant="outline" size="sm">下一页</Button></Link>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
