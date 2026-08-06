import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { isAdmin } from "@/lib/permissions"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { notFound } from "next/navigation"
import { DeleteCollectionButton } from "@/components/delete-collection-button"
import { CommentSection } from "@/components/comment-section"
import { EditCollectionButton } from "@/components/edit-collection-button"
import { CollectionResourceNote } from "./resource-note"
import { RemoveResourceButton } from "./remove-resource-button"
import { AddResourceToCollection } from "./add-resource"

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
          parent: { select: { user: { select: { id: true, username: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
      favorites: {
        where: session?.user ? { userId: (session.user as { id: string }).id } : undefined,
      },
      _count: { select: { favorites: true, comments: true } },
    },
  })

  if (!collection) notFound()

  const isOwner = session?.user ? collection.creatorId === (session.user as { id: string }).id : false
  const canManage = isOwner || isAdmin(session)
  const isFavorited = collection.favorites.length > 0

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link href="/collections" className="text-sm text-muted-foreground hover:underline">
        ← 回到目录列表
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{collection.title}</h1>
            {isOwner && (
              <EditCollectionButton id={collection.id} title={collection.title} description={collection.description ?? ""} />
            )}
          </div>
          {collection.description && (
            <p className="mt-2 text-muted-foreground">{collection.description}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <Link href={`/profile/${collection.creator.username}`}>
              <Avatar className="h-5 w-5">
                <AvatarImage src={collection.creator.avatar ?? undefined} />
                <AvatarFallback className="text-xs">{collection.creator.username.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <Link href={`/profile/${collection.creator.username}`} className="text-sm hover:underline">
              {collection.creator.username}
            </Link>
            <span className="text-sm text-muted-foreground">
              · {collection._count.favorites} 收藏 · {collection._count.comments} 评论
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {session?.user && !isOwner && (
            <form action={async () => {
              "use server"
              const { toggleFavoriteCollection } = await import("@/lib/actions/collection")
              await toggleFavoriteCollection(collection.id)
            }}>
              <Button type="submit" variant={isFavorited ? "destructive" : "default"} size="sm">
                {isFavorited ? "取消收藏" : "收藏"}
              </Button>
            </form>
          )}
          {canManage && <DeleteCollectionButton collectionId={collection.id} />}
        </div>
      </div>

      <Separator className="my-6" />

      {isOwner && (
        <div className="mb-4">
          <AddResourceToCollection
            collectionId={collection.id}
            existingIds={collection.resources.map((cr) => cr.resource.id)}
          />
        </div>
      )}

      <div className="space-y-4">
        {collection.resources.map((cr) => (
          <Card key={cr.id} className="group overflow-hidden">
            <div className="flex gap-4 p-4">
              <Link href={`/resource/${cr.resource.id}`} className="shrink-0">
                {cr.resource.coverImage ? (
                  <img src={cr.resource.coverImage} alt={cr.resource.title} loading="lazy" decoding="async" className="h-24 w-16 rounded object-contain bg-muted/30" />
                ) : (
                  <div className="flex h-24 w-16 items-center justify-center rounded bg-muted text-xl">📄</div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/resource/${cr.resource.id}`} className="font-semibold hover:underline line-clamp-1">
                  {cr.resource.title}
                </Link>
                <div className="mt-1 flex flex-wrap gap-1">
                  {cr.resource.tags.map((rt) => (
                    <Badge key={rt.tag.id} variant="outline" className="text-xs">{rt.tag.name}</Badge>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cr.resource.uploader.username} · {cr.resource._count.recommendations} 推荐 · {cr.resource._count.comments} 评论
                </p>
                {cr.note && (
                  <div className="mt-2 rounded-md bg-muted/50 p-2.5 text-sm text-muted-foreground">{cr.note}</div>
                )}
                <CollectionResourceNote crId={cr.id} note={cr.note} isOwner={isOwner} />
              </div>
              {isOwner && (
                <RemoveResourceButton collectionId={collection.id} resourceId={cr.resource.id} />
              )}
            </div>
          </Card>
        ))}
      </div>

      {collection.resources.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p>这个目录还没有任何资源</p>
          </CardContent>
        </Card>
      )}

      <Separator className="my-8" />

      <CommentSection
        collectionId={collection.id}
        comments={collection.comments}
        currentUserId={session?.user ? (session.user as { id: string }).id : undefined}
      />
    </div>
  )
}
