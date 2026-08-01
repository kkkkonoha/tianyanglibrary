import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { notFound } from "next/navigation"
import { EditAvatar } from "@/components/edit-avatar"

import { Button } from "@/components/ui/button"

const typeLabels: Record<string, string> = {
  BOOK: "📖 电子书",
  COMIC: "📘 漫画",
}

const typeIcons: Record<string, string> = {
  BOOK: "BOOK",
  COMIC: "COMIC",
}

const SECTION_LIMIT = 6

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const decodedUsername = decodeURIComponent(username)
  const session = await auth()

  const user = await prisma.user.findUnique({
    where: { username: decodedUsername },
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

  if (!user) notFound()

  const isOwner = session?.user
    ? (session.user as { id: string }).id === user.id
    : false

  const [
    resources, totalResources,
    collections, totalCollections,
    recommendations, totalRecommendations,
    favorites, totalFavorites,
  ] = await Promise.all([
    prisma.resource.findMany({
      where: { uploaderId: user.id },
      orderBy: { createdAt: "desc" },
      take: SECTION_LIMIT,
      include: { tags: { include: { tag: true } }, _count: { select: { recommendations: true, comments: true } } },
    }),
    prisma.resource.count({ where: { uploaderId: user.id } }),
    prisma.collection.findMany({
      where: { creatorId: user.id },
      orderBy: { createdAt: "desc" },
      take: SECTION_LIMIT,
      include: { _count: { select: { resources: true, favorites: true } } },
    }),
    prisma.collection.count({ where: { creatorId: user.id } }),
    prisma.recommendation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: SECTION_LIMIT,
      include: { resource: { select: { id: true, title: true, type: true, coverImage: true } } },
    }),
    prisma.recommendation.count({ where: { userId: user.id } }),
    prisma.favoriteCollection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: SECTION_LIMIT,
      include: { collection: { include: { creator: { select: { username: true } }, _count: { select: { resources: true, favorites: true } } } } },
    }),
    prisma.favoriteCollection.count({ where: { userId: user.id } }),
  ])

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-4 rounded-xl border bg-card p-5">
        <Avatar className="h-20 w-20 shrink-0">
          <AvatarImage src={user.avatar ?? undefined} />
          <AvatarFallback className="text-2xl">{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{user.username}</h1>
          {user.bio && <p className="mt-1 text-muted-foreground">{user.bio}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{totalResources} 资源</span>
            <span>{totalCollections} 目录</span>
            <span>{totalRecommendations} 推荐</span>
            <span>{totalFavorites} 收藏</span>
          </div>
        </div>
      </div>

      {isOwner && (
        <div className="mb-6">
          <EditAvatar username={user.username} currentAvatar={user.avatar} />
        </div>
      )}

      {/* Resources */}
      <Section title="资源" count={totalResources}>
        {resources.length === 0 ? (
          <Empty>还没有上传资源</Empty>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((r) => (
                <Link key={r.id} href={`/resource/${r.id}`}>
                  <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                    {r.coverImage ? (
                      <img src={r.coverImage} alt={r.title} loading="lazy" decoding="async" className="h-32 w-full object-contain bg-muted/30" />
                    ) : (
                      <div className="flex h-32 items-center justify-center bg-muted">
                        <span className="text-3xl font-bold text-muted-foreground/30">{typeIcons[r.type]}</span>
                      </div>
                    )}
                    <CardContent className="p-3">
                      <Badge variant="secondary" className="text-xs mb-1">{typeLabels[r.type]}</Badge>
                      <h3 className="font-medium text-sm line-clamp-1">{r.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{r._count.recommendations} 推荐 · {r._count.comments} 评论</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            {totalResources > SECTION_LIMIT && (
              <div className="mt-3 text-center">
                <Link href={`/profile/${user.username}/resources`}>
                  <Button variant="outline" size="sm">查看更多资源 ({totalResources})</Button>
                </Link>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Collections */}
      <Section title="目录" count={totalCollections}>
        {collections.length === 0 ? (
          <Empty>还没有创建目录</Empty>
        ) : (
          <>
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
            {totalCollections > SECTION_LIMIT && (
              <div className="mt-3 text-center">
                <Link href={`/profile/${user.username}/collections`}>
                  <Button variant="outline" size="sm">查看更多目录 ({totalCollections})</Button>
                </Link>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Recommendations */}
      <Section title="推荐" count={totalRecommendations}>
        {recommendations.length === 0 ? (
          <Empty>还没有推荐过资源</Empty>
        ) : (
          <>
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <Link key={rec.id} href={`/resource/${rec.resource.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="flex items-center gap-3 p-4">
                      {rec.resource.coverImage ? (
                        <img src={rec.resource.coverImage} alt={rec.resource.title} loading="lazy" decoding="async" className="h-12 w-9 shrink-0 rounded object-contain bg-muted/30" />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-sm">{rec.resource.title}</h4>
                        <Badge variant="secondary" className="text-xs mt-1">{typeLabels[rec.resource.type]}</Badge>
                        {rec.note && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">&ldquo;{rec.note}&rdquo;</p>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            {totalRecommendations > SECTION_LIMIT && (
              <div className="mt-3 text-center">
                <Link href={`/profile/${user.username}/recommendations`}>
                  <Button variant="outline" size="sm">查看更多推荐 ({totalRecommendations})</Button>
                </Link>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Favorites */}
      <Section title="收藏的目录" count={totalFavorites}>
        {favorites.length === 0 ? (
          <Empty>还没有收藏目录</Empty>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {favorites.map((fav) => (
                <Link key={fav.id} href={`/collections/${fav.collection.id}`}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <h3 className="font-medium">{fav.collection.title}</h3>
                      <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                        <span>{fav.collection.creator.username}</span>
                        <span>·</span>
                        <span>{fav.collection._count.resources} 资源</span>
                        <span>·</span>
                        <span>{fav.collection._count.favorites} 收藏</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            {totalFavorites > SECTION_LIMIT && (
              <div className="mt-3 text-center">
                <Link href={`/profile/${user.username}/favorites`}>
                  <Button variant="outline" size="sm">查看更多收藏的目录 ({totalFavorites})</Button>
                </Link>
              </div>
            )}
          </>
        )}
      </Section>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        {title}
        <span className="text-sm font-normal text-muted-foreground">({count})</span>
      </h2>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center text-muted-foreground">{children}</CardContent>
    </Card>
  )
}
