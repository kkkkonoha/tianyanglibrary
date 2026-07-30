import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { notFound } from "next/navigation"
import { Separator } from "@/components/ui/separator"

const typeLabels: Record<string, string> = {
  BOOK: "📖 电子书",
  COMIC: "📘 漫画",
  VIDEO: "🎬 视频",
  OTHER: "📁 其他",
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
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { recommendations: true, comments: true } },
    },
  })

  if (!resource) {
    notFound()
  }

  const hasRecommended = session?.user
    ? resource.recommendations.some((r) => r.userId === (session.user as { id: string }).id)
    : false

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
                <img
                  src={resource.coverImage}
                  alt={resource.title}
                  className="h-48 w-32 rounded-lg object-cover shadow-md"
                />
              ) : (
                <div className="flex h-48 w-32 items-center justify-center rounded-lg bg-muted">
                  <span className="text-4xl">{typeLabels[resource.type].charAt(0)}</span>
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
                </div>
              </div>
            </div>

            {resource.description && (
              <div className="mt-4">
                <p className="text-muted-foreground whitespace-pre-wrap">{resource.description}</p>
              </div>
            )}
          </div>

          {resource.fileUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">文件下载</CardTitle>
              </CardHeader>
              <CardContent>
                <a href={resource.fileUrl} download>
                  <Button>下载文件</Button>
                </a>
              </CardContent>
            </Card>
          )}

          <Separator />

          <CommentSection
            resourceId={resource.id}
            session={session}
            initialComments={resource.comments}
          />
        </div>

        <div className="space-y-4">
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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

function CommentSection({
  resourceId,
  session,
  initialComments,
}: {
  resourceId: string
  session: any
  initialComments: any[]
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        评论 ({initialComments.length})
      </h2>

      {session?.user ? (
        <form
          action={async (formData: FormData) => {
            "use server"
            const { addComment } = await import("@/lib/actions/comment")
            formData.set("resourceId", resourceId)
            await addComment(formData)
          }}
          className="flex gap-2"
        >
          <input type="hidden" name="resourceId" value={resourceId} />
          <input
            type="text"
            name="content"
            placeholder="写下你的评论..."
            required
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <Button type="submit" size="sm">
            发送
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="underline">
            登录
          </Link>{" "}
          后发表评论
        </p>
      )}

      {initialComments.length > 0 && (
        <div className="space-y-3">
          {initialComments.map((comment) => (
            <div key={comment.id} className="flex gap-3 rounded-lg bg-muted/50 p-3">
              <Link href={`/profile/${comment.user.username}`}>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={comment.user.avatar ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {comment.user.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/profile/${comment.user.username}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {comment.user.username}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
                <p className="text-sm mt-1">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
