import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const PAGE_SIZE = 24
const typeLabels: Record<string, string> = { BOOK: "📖 电子书", COMIC: "📘 漫画" }

export default async function UserRecommendationsPage({
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

  const [recs, total] = await Promise.all([
    prisma.recommendation.findMany({
      where: { userId: user.id }, orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { resource: { select: { id: true, title: true, type: true, coverImage: true } } },
    }),
    prisma.recommendation.count({ where: { userId: user.id } }),
  ])
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <Link href={`/profile/${user.username}`} className="text-sm text-muted-foreground hover:underline">← 回到 {user.username} 的主页</Link>
      <div className="mt-4 mb-8"><h1 className="text-3xl font-bold tracking-tight">{user.username} 的推荐 ({total})</h1></div>
      {recs.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">还没有推荐</CardContent></Card>
      ) : (
        <>
          <div className="space-y-3">
            {recs.map((rec) => (
              <Link key={rec.id} href={`/resource/${rec.resource.id}`}><Card className="transition-shadow hover:shadow-md"><CardContent className="flex items-center gap-3 p-4">{rec.resource.coverImage ? <img src={rec.resource.coverImage} alt={rec.resource.title} loading="lazy" decoding="async" className="h-12 w-9 shrink-0 rounded object-contain bg-muted/30" /> : null}<div className="min-w-0 flex-1"><h4 className="font-medium text-sm">{rec.resource.title}</h4><Badge variant="secondary" className="text-xs mt-1">{typeLabels[rec.resource.type]}</Badge>{rec.note && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">&ldquo;{rec.note}&rdquo;</p>}</div></CardContent></Card></Link>
            ))}
          </div>
          {totalPages > 1 && <Pagination path={`/profile/${user.username}/recommendations`} page={currentPage} total={totalPages} />}
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
