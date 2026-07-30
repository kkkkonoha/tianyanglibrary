import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { notFound } from "next/navigation"

const typeLabels: Record<string, string> = {
  BOOK: "📖 电子书",
  COMIC: "📘 漫画",
  VIDEO: "🎬 视频",
  OTHER: "📁 其他",
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const session = await auth()

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      _count: {
        select: {
          resources: true,
          collections: true,
          recommendations: true,
        },
      },
    },
  })

  if (!user) {
    notFound()
  }

  const isOwner = session?.user
    ? (session.user as { id: string }).id === user.id
    : false

  const [resources, collections, recommendations] = await Promise.all([
    prisma.resource.findMany({
      where: { uploaderId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        tags: { include: { tag: true } },
        _count: { select: { recommendations: true, comments: true } },
      },
    }),
    prisma.collection.findMany({
      where: { creatorId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { resources: true, favorites: true } },
      },
    }),
    prisma.recommendation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        resource: {
          select: {
            id: true,
            title: true,
            type: true,
            coverImage: true,
          },
        },
      },
    }),
  ])

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user.avatar ?? undefined} />
          <AvatarFallback className="text-2xl">
            {user.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{user.username}</h1>
          {user.bio && <p className="mt-1 text-muted-foreground">{user.bio}</p>}
          <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
            <span>{user._count.resources} 资源</span>
            <span>{user._count.collections} 书单</span>
            <span>{user._count.recommendations} 推荐</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="resources">
        <TabsList>
          <TabsTrigger value="resources">
            资源 ({resources.length})
          </TabsTrigger>
          <TabsTrigger value="collections">
            书单 ({collections.length})
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            推荐 ({recommendations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="mt-4">
          {resources.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                还没有上传资源
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((r) => (
                <Link key={r.id} href={`/resource/${r.id}`}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    {r.coverImage ? (
                      <img
                        src={r.coverImage}
                        alt={r.title}
                        className="h-32 w-full rounded-t-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-32 items-center justify-center rounded-t-lg bg-muted">
                        <span className="text-3xl">{typeLabels[r.type].charAt(0)}</span>
                      </div>
                    )}
                    <CardContent className="p-3">
                      <Badge variant="secondary" className="text-xs mb-1">
                        {typeLabels[r.type]}
                      </Badge>
                      <h3 className="font-medium text-sm line-clamp-1">{r.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {r._count.recommendations} 推荐 · {r._count.comments} 评论
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="collections" className="mt-4">
          {collections.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                还没有创建书单
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {collections.map((c) => (
                <Link key={c.id} href={`/collections/${c.id}`}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <h3 className="font-medium">{c.title}</h3>
                      <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                        <span>{c._count.resources} 资源</span>
                        <span>{c._count.favorites} 收藏</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="mt-4">
          {recommendations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                还没有推荐过资源
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <Link key={rec.id} href={`/resource/${rec.resource.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="flex items-center gap-3 p-4">
                      {rec.resource.coverImage ? (
                        <img
                          src={rec.resource.coverImage}
                          alt={rec.resource.title}
                          className="h-12 w-9 rounded object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm">{rec.resource.title}</h4>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {typeLabels[rec.resource.type]}
                        </Badge>
                        {rec.note && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            &ldquo;{rec.note}&rdquo;
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
