import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { notFound } from "next/navigation"

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, username: true, avatar: true } },
      resources: {
        include: {
          resource: {
            include: {
              uploader: { select: { id: true, username: true, avatar: true } },
              tags: { include: { tag: true } },
              _count: { select: { recommendations: true, comments: true } },
            },
          },
        },
        orderBy: { addedAt: "desc" },
      },
      comments: {
        include: {
          user: { select: { id: true, username: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      favorites: {
        where: session?.user ? { userId: (session.user as { id: string }).id } : undefined,
      },
      _count: { select: { favorites: true, comments: true } },
    },
  })

  if (!collection) {
    notFound()
  }

  const isOwner = session?.user
    ? collection.creatorId === (session.user as { id: string }).id
    : false

  const isFavorited = collection.favorites.length > 0

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link href="/collections" className="text-sm text-muted-foreground hover:underline">
        ← 回到书单列表
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{collection.title}</h1>
          {collection.description && (
            <p className="mt-2 text-muted-foreground">{collection.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Link href={`/profile/${collection.creator.username}`}>
              <Avatar className="h-5 w-5">
                <AvatarImage src={collection.creator.avatar ?? undefined} />
                <AvatarFallback className="text-xs">
                  {collection.creator.username.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <Link
              href={`/profile/${collection.creator.username}`}
              className="text-sm hover:underline"
            >
              {collection.creator.username}
            </Link>
            <span className="text-sm text-muted-foreground">
              · {collection._count.favorites} 收藏 · {collection._count.comments} 评论
            </span>
          </div>
        </div>

        {session?.user && !isOwner && (
          <form
            action={async () => {
              "use server"
              const { toggleFavoriteCollection } = await import("@/lib/actions/collection")
              await toggleFavoriteCollection(collection.id)
            }}
          >
            <Button type="submit" variant={isFavorited ? "destructive" : "default"} size="sm">
              {isFavorited ? "取消收藏" : "收藏"}
            </Button>
          </form>
        )}
      </div>

      <Separator className="my-6" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collection.resources.map((cr) => (
          <Link key={cr.id} href={`/resource/${cr.resource.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              {cr.resource.coverImage ? (
                <img
                  src={cr.resource.coverImage}
                  alt={cr.resource.title}
                  className="h-32 w-full rounded-t-lg object-cover"
                />
              ) : (
                <div className="flex h-32 items-center justify-center rounded-t-lg bg-muted">
                  <span className="text-3xl">📄</span>
                </div>
              )}
              <CardContent className="p-3">
                <h3 className="font-medium text-sm line-clamp-1">{cr.resource.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {cr.resource.uploader.username} · {cr.resource._count.recommendations} 推荐
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {collection.resources.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p>这个书单还没有任何资源</p>
          </CardContent>
        </Card>
      )}

      <Separator className="my-8" />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          评论 ({collection._count.comments})
        </h2>

        {session?.user ? (
          <form
            action={async (formData: FormData) => {
              "use server"
              const { addComment } = await import("@/lib/actions/comment")
              formData.set("collectionId", collection.id)
              await addComment(formData)
            }}
            className="flex gap-2"
          >
            <input type="hidden" name="collectionId" value={collection.id} />
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

        {collection.comments.length > 0 && (
          <div className="space-y-3">
            {collection.comments.map((comment) => (
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
    </div>
  )
}
