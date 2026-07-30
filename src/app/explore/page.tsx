import { prisma } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const typeLabels: Record<string, string> = {
  BOOK: "📖 电子书",
  COMIC: "📘 漫画",
  VIDEO: "🎬 视频",
  OTHER: "📁 其他",
}

const typeColors: Record<string, string> = {
  BOOK: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  COMIC: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  VIDEO: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>
}) {
  const { q, type } = await searchParams

  const where: any = {}
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ]
  }
  if (type && type !== "ALL") {
    where.type = type
  }

  const resources = await prisma.resource.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      uploader: { select: { id: true, username: true, avatar: true } },
      tags: { include: { tag: true } },
      _count: { select: { recommendations: true, comments: true } },
    },
  })

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">探索资源</h1>
        <p className="mt-2 text-muted-foreground">浏览动漫社共享图书馆的所有资源</p>
      </div>

      <form className="mb-6 flex gap-2">
        <input type="hidden" name="type" value={type ?? "ALL"} />
        <Input
          name="q"
          placeholder="搜索资源..."
          defaultValue={q ?? ""}
          className="max-w-sm"
        />
        <Button type="submit">搜索</Button>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { value: "ALL", label: "全部" },
          { value: "BOOK", label: "📖 电子书" },
          { value: "COMIC", label: "📘 漫画" },
          { value: "VIDEO", label: "🎬 视频" },
          { value: "OTHER", label: "📁 其他" },
        ].map((t) => (
          <Link
            key={t.value}
            href={`/explore?type=${t.value}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          >
            <Badge variant={type === t.value || (!type && t.value === "ALL") ? "default" : "outline"}>
              {t.label}
            </Badge>
          </Link>
        ))}
      </div>

      {resources.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg text-muted-foreground">没有找到资源</p>
            <p className="text-sm text-muted-foreground">尝试其他搜索条件</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {resources.map((resource) => (
            <Link key={resource.id} href={`/resource/${resource.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                {resource.coverImage ? (
                  <img
                    src={resource.coverImage}
                    alt={resource.title}
                    className="h-40 w-full rounded-t-lg object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-t-lg bg-muted">
                    <span className="text-4xl">{typeLabels[resource.type].charAt(0)}</span>
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="mb-1 flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs px-1.5">
                      {typeLabels[resource.type]}
                    </Badge>
                  </div>
                  <h3 className="font-medium line-clamp-1">{resource.title}</h3>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={resource.uploader.avatar ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {resource.uploader.username.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{resource.uploader.username}</span>
                    <span>·</span>
                    <span>{resource._count.recommendations} 推荐</span>
                    <span>·</span>
                    <span>{resource._count.comments} 评论</span>
                  </div>
                  {resource.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {resource.tags.slice(0, 3).map((rt) => (
                        <Badge key={rt.tag.id} variant="outline" className="text-xs px-1.5">
                          {rt.tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
