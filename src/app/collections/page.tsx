import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>
}) {
  const session = await auth()
  const { q, sort } = await searchParams

  const where: any = { isPublic: true }
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { creator: { username: { contains: q } } },
    ]
  }

  const orderBy = sort === "hot"
    ? { favorites: { _count: "desc" as const } }
    : { createdAt: "desc" as const }

  const collections = await prisma.collection.findMany({
    where,
    orderBy,
    take: 100,
    include: {
      creator: { select: { id: true, username: true, avatar: true } },
      _count: { select: { resources: true, favorites: true, comments: true } },
    },
  })

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">目录</h1>
          <p className="mt-1.5 text-muted-foreground">看看大家创建的主题目录</p>
        </div>
        {session?.user && (
          <Link href="/collections/new">
            <Button>创建目录</Button>
          </Link>
        )}
      </div>

      <form className="mb-6 flex gap-2">
        <Input name="q" placeholder="搜索目录名或创建人..." defaultValue={q ?? ""} className="max-w-sm bg-background" />
        <Button type="submit">搜索</Button>
      </form>

      <div className="mb-4 flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">排序：</span>
        {[
          { value: "new", label: "最新" },
          { value: "hot", label: "最热" },
        ].map((s) => (
          <Link
            key={s.value}
            href={`/collections?${s.value !== "new" ? `sort=${s.value}&` : ""}${q ? `q=${encodeURIComponent(q)}` : ""}`}
          >
            <Badge variant={(sort ?? "new") === s.value ? "default" : "secondary"}>
              {s.label}
            </Badge>
          </Link>
        ))}
      </div>

      {collections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg text-muted-foreground">还没有目录</p>
            {session?.user && (
              <Link href="/collections/new" className="mt-4">
                <span className="text-primary underline">创建第一个目录</span>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {collections.map((collection, i) => (
            <Link key={collection.id} href={`/collections/${collection.id}`} className="animate-lib-rise-in" style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }}>
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
