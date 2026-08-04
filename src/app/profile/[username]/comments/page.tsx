import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExpandableText } from "@/components/expandable-text"

const PAGE_SIZE = 24
const typeLabels: Record<string, string> = { BOOK: "📖 电子书", COMIC: "📘 漫画" }

export default async function UserCommentsPage({
  params, searchParams,
}: {
  params: Promise<{ username: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { username } = await params
  const { page } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? "1") || 1)

  const user = await prisma.user.findUnique({
    where: { username: decodeURIComponent(username) },
    select: { id: true, username: true },
  })
  if (!user) notFound()

  const where = { userId: user.id, parentId: null as string | null, resourceId: { not: null } }
  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { resource: { select: { id: true, title: true, type: true, coverImage: true } } },
    }),
    prisma.comment.count({ where }),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <Link href={`/profile/${user.username}`} className="text-sm text-muted-foreground hover:underline">← 回到 {user.username} 的主页</Link>
      <div className="mt-4 mb-8"><h1 className="text-3xl font-bold tracking-tight">{user.username} 的评论 ({total})</h1></div>
      {comments.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">还没有评论</CardContent></Card>
      ) : (
        <>
          <div className="space-y-3">
            {comments.map((c) => (
              <Link key={c.id} href={`/resource/${c.resource!.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <p className="text-sm whitespace-pre-wrap"><ExpandableText text={c.content} /></p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      {c.resource!.coverImage ? (
                        <img src={c.resource!.coverImage} alt={c.resource!.title} loading="lazy" decoding="async" className="h-6 w-4 rounded object-contain bg-muted/30" />
                      ) : null}
                      <span className="font-medium text-primary">{c.resource!.title}</span>
                      <Badge variant="secondary" className="text-xs">{typeLabels[c.resource!.type]}</Badge>
                      <span className="ml-auto">{new Date(c.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {totalPages > 1 && <Pagination path={`/profile/${user.username}/comments`} page={currentPage} total={totalPages} />}
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
