import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default async function CollectionsPage() {
  const session = await auth()

  const collections = await prisma.collection.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      creator: { select: { id: true, username: true, avatar: true } },
      _count: { select: { resources: true, favorites: true, comments: true } },
    },
  })

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">书单</h1>
          <p className="mt-2 text-muted-foreground">看看大家创建的主题书单</p>
        </div>
        {session?.user && (
          <Link href="/collections/new">
            <Button>创建书单</Button>
          </Link>
        )}
      </div>

      {collections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg text-muted-foreground">还没有书单</p>
            {session?.user && (
              <Link href="/collections/new" className="mt-4">
                <span className="text-primary underline">创建第一个书单</span>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {collections.map((collection) => (
            <Link key={collection.id} href={`/collections/${collection.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold">{collection.title}</h3>
                  {collection.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={collection.creator.avatar ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {collection.creator.username.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{collection.creator.username}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {collection._count.resources} 个资源
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {collection._count.favorites} 收藏
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {collection._count.comments} 评论
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
