import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { getManga, fetchMangaChapters } from "@/lib/suwayomi"
import { ensureComicResource } from "@/lib/actions/comic"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CommentSection } from "@/components/comment-section"
import { RecommendButton } from "@/components/recommend-button"
import { AddToDirectoryButton } from "@/components/add-to-directory-button"

export const dynamic = "force-dynamic"

export default async function ComicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()

  let manga: any
  let chapters: any[] = []
  try {
    manga = await getManga(id)
    chapters = await fetchMangaChapters(id)
  } catch {
    notFound()
  }

  // 自动入库：查找或创建本地 Resource
  const imported = await ensureComicResource(id, manga.sourceId ?? "524579092615598717")

  // 查本地 Resource 及其推荐/评论
  let resource: any = null
  let hasRecommended = false
  let userDirs: Array<{ id: string; title: string }> = []
  if (imported.resourceId) {
    resource = await prisma.resource.findUnique({
      where: { id: imported.resourceId },
      include: {
        uploader: { select: { id: true, username: true, avatar: true } },
        recommendations: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
        },
        comments: {
          include: {
            user: { select: { id: true, username: true, avatar: true } },
            parent: { select: { user: { select: { id: true, username: true } } } },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { recommendations: true, comments: true } },
      },
    })
    if (resource) {
      hasRecommended = resource.recommendations.some(
        (r: any) => r.userId === (session.user as { id: string }).id
      )
      if (resource.uploaderId === (session.user as { id: string }).id) {
        userDirs = await prisma.collection.findMany({
          where: { creatorId: session.user.id as string },
          select: { id: true, title: true },
          orderBy: { createdAt: "desc" },
        })
      }
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link href="/comics" className="text-sm text-muted-foreground hover:underline">
        ← 回到漫画搜索
      </Link>

      <div className="mt-5 flex gap-5">
        <div className="h-56 w-40 shrink-0 overflow-hidden rounded-lg bg-muted/30">
          {manga.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/suwayomi${manga.thumbnailUrl}`} alt={manga.title} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-muted-foreground/30">📘</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{manga.title}</h1>
          {manga.author && <p className="mt-1 text-sm text-muted-foreground">作者：{manga.author}</p>}
          {manga.genre && manga.genre.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {manga.genre.slice(0, 8).map((g: string) => (
                <Badge key={g} variant="secondary">{g}</Badge>
              ))}
            </div>
          )}
          {manga.description && (
            <p className="mt-3 text-sm text-muted-foreground line-clamp-4">{manga.description}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{chapters.length} 章</Badge>
            <Badge variant="secondary">已入库</Badge>
            {resource?.id && (
              <Link href={`/resource/${resource.id}`}>
                <Button variant="outline" size="sm">查看条目</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">章节列表</h2>
        {chapters.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无章节</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {chapters.map((ch) => (
              <Link
                key={ch.id}
                href={`/comics/${id}/read?chapter=${ch.id}`}
                className="flex items-center justify-between rounded-lg border bg-background px-4 py-2.5 text-sm transition-colors hover:bg-secondary/50"
              >
                <span className="flex-1 truncate">{ch.name}</span>
                {ch.scanlator && <span className="ml-2 shrink-0 text-xs text-muted-foreground">{ch.scanlator}</span>}
              </Link>
            ))}
          </div>
        )}
      </div>

      {resource && (
        <>
          <Separator className="my-8" />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <CommentSection
                resourceId={resource.id}
                comments={resource.comments}
                currentUserId={session?.user ? (session.user as { id: string }).id : undefined}
              />
            </div>

            <div className="space-y-4">
              {session?.user && userDirs.length > 0 && (
                <AddToDirectoryButton resourceId={resource.id} directories={userDirs} />
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    推荐 ({resource._count.recommendations})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RecommendButton
                    resourceId={resource.id}
                    hasRecommended={hasRecommended}
                  />
                  {resource.recommendations.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {resource.recommendations.slice(0, 10).map((rec: any) => (
                        <div key={rec.id} className="flex items-start gap-2">
                          <Link href={`/profile/${rec.user.username}`}>
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={rec.user.avatar ?? undefined} />
                              <AvatarFallback className="text-xs">
                                {rec.user.username.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <div className="min-w-0">
                            <Link
                              href={`/profile/${rec.user.username}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {rec.user.username}
                            </Link>
                            {rec.note && (
                              <p className="text-xs text-muted-foreground mt-0.5">{rec.note}</p>
                            )}
                            <p className="text-xs text-muted-foreground/50 mt-0.5">
                              {new Date(rec.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
