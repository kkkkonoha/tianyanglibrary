import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { notFound } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { isAdmin } from "@/lib/permissions"
import { CommentSection } from "@/components/comment-section"
import { DeleteResourceButton } from "@/components/delete-resource-button"
import { AddToDirectoryButton } from "@/components/add-to-directory-button"
import { ImagePreview } from "@/components/image-preview"

const typeLabels: Record<string, string> = {
  BOOK: "📖 电子书",
  COMIC: "📘 漫画",
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      uploader: { select: { id: true, username: true, avatar: true } },
      tags: { include: { tag: true } },
      recommendations: {
        include: {
          user: { select: { id: true, username: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      comments: {
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          parent: { select: { user: { select: { id: true, username: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
      files: { orderBy: { createdAt: "asc" } },
      _count: { select: { recommendations: true, comments: true } },
    },
  })

  if (!resource) {
    notFound()
  }

  let userDirs: Array<{ id: string; title: string }> = []
  if (session?.user) {
    userDirs = await prisma.collection.findMany({
      where: { creatorId: session.user.id as string },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    })
  }

  // Related resources by shared tags
  const tagIds = resource.tags.map((rt) => rt.tagId)
  interface RelatedItem {
    id: string; title: string; type: string; coverImage: string | null
    username: string; avatar: string | null
    recCount: number; sharedTags: number
  }
  let relatedItems: RelatedItem[] = []
  if (tagIds.length > 0) {
    const placeholders = tagIds.map(() => "?").join(",")
    relatedItems = await prisma.$queryRawUnsafe<RelatedItem[]>(
      `SELECT r.id, r.title, r.type, r.coverImage, u.username, u.avatar,
              (SELECT COUNT(*) FROM Recommendation WHERE resourceId = r.id) as recCount,
              COUNT(rt2.tagId) as sharedTags
       FROM Resource r
       JOIN ResourceTag rt2 ON r.id = rt2.resourceId
       JOIN User u ON r.uploaderId = u.id
       WHERE rt2.tagId IN (${placeholders}) AND r.id != ?
       GROUP BY r.id
       ORDER BY sharedTags DESC, recCount DESC, r.createdAt DESC
       LIMIT 6`,
      ...tagIds, id
    )
  }

  const hasRecommended = session?.user
    ? resource.recommendations.some((r) => r.userId === (session.user as { id: string }).id)
    : false

  const isOwner = session?.user
    ? resource.uploaderId === (session.user as { id: string }).id
    : false

  const canManage = isOwner || isAdmin(session)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <Link href="/explore" className="text-sm text-muted-foreground hover:underline">
              ← 回到探索
            </Link>
            <div className="mt-4 flex items-start gap-4">
              {resource.coverImage ? (
                <ImagePreview src={resource.coverImage} alt={resource.title}>
                  <img
                    src={resource.coverImage}
                    alt={resource.title}
                    className="h-48 w-32 rounded-lg object-contain shadow-md bg-muted/30"
                  />
                </ImagePreview>
              ) : (
                <div className="flex h-48 w-32 items-center justify-center rounded-lg bg-muted">
                  <span className="text-4xl font-bold text-muted-foreground/30">{resource.type}</span>
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{resource.title}</h1>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary">{typeLabels[resource.type]}</Badge>
                  {resource.tags.map((rt) => (
                    <Badge key={rt.tag.id} variant="outline">
                      {rt.tag.name}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Link href={`/profile/${resource.uploader.username}`}>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={resource.uploader.avatar ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {resource.uploader.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <Link
                    href={`/profile/${resource.uploader.username}`}
                    className="text-sm hover:underline"
                  >
                    {resource.uploader.username}
                  </Link>
                  {isOwner && (
                    <span className="text-xs text-muted-foreground">（所有者）</span>
                  )}
                </div>
                {canManage && (
                  <div className="mt-3 flex gap-2">
                    <Link href={`/resource/${resource.id}/edit`}>
                      <Button variant="outline" size="sm">编辑</Button>
                    </Link>
                    <DeleteResourceButton resourceId={resource.id} />
                  </div>
                )}
              </div>
            </div>

            {resource.description && (
              <div className="mt-4">
                <p className="text-muted-foreground whitespace-pre-wrap">{resource.description}</p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground/60">
              <span>上传于 {new Date(resource.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</span>
              {resource.updatedAt !== resource.createdAt && (
                <span>更新于 {new Date(resource.updatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</span>
              )}
            </div>
          </div>

          {resource.files && resource.files.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">文件下载 ({resource.files.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {resource.files.map((f) => (
                  <a
                    key={f.id}
                    href={`/api/download?path=${encodeURIComponent(f.fileUrl)}${f.fileName ? `&name=${encodeURIComponent(f.fileName)}` : ""}`}
                    download
                    className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/80"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    <span className="flex-1 truncate">{f.fileName}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{(f.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                  </a>
                ))}
              </CardContent>
            </Card>
          ) : canManage ? (
            <Card className="border-dashed">
              <CardContent className="flex items-center justify-between py-3">
                <p className="text-sm text-muted-foreground">还没有上传文件</p>
                <Link href={`/resource/${resource.id}/edit`}>
                  <Button variant="outline" size="sm">去上传</Button>
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <Separator />

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
                session={session}
              />
              {resource.recommendations.length > 0 && (
                <div className="mt-4 space-y-3">
                  {resource.recommendations.slice(0, 10).map((rec) => (
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

          {relatedItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">相关推荐</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {relatedItems.map((item) => (
                  <Link key={item.id} href={`/resource/${item.id}`} className="flex items-start gap-2.5 rounded-lg p-1.5 -mx-1.5 transition-colors hover:bg-muted/50">
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.title} className="h-10 w-7 shrink-0 rounded object-contain bg-muted/30" />
                    ) : (
                      <div className="flex h-10 w-7 shrink-0 items-center justify-center rounded bg-muted text-xs">{typeLabels[item.type]?.charAt(0) ?? "?"}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{item.username}</span>
                        <span>·</span>
                        <span>{item.recCount} 推荐</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function RecommendButton({
  resourceId,
  hasRecommended,
  session,
}: {
  resourceId: string
  hasRecommended: boolean
  session: any
}) {
  return (
    <form
      action={async (formData: FormData) => {
        "use server"
        const { toggleRecommendation } = await import("@/lib/actions/recommendation")
        formData.set("resourceId", resourceId)
        await toggleRecommendation(formData)
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="resourceId" value={resourceId} />
      <input
        type="text"
        name="note"
        placeholder="推荐理由（可选）"
        className="flex-1 rounded-md border px-3 py-1 text-sm"
      />
      <Button type="submit" variant={hasRecommended ? "destructive" : "default"} size="sm">
        {hasRecommended ? "取消推荐" : "推荐"}
      </Button>
    </form>
  )
}
