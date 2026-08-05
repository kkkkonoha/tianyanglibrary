import { prisma } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ImagePreview } from "@/components/image-preview"

const typeLabels: Record<string, string> = {
  BOOK: "电子书",
  COMIC: "漫画",
}

const typeIcons: Record<string, string> = {
  BOOK: "📖",
  COMIC: "📘",
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; tag?: string; page?: string; sort?: string }>
}) {
  const { q, type, tag, page, sort } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? "1") || 1)
  const PAGE_SIZE = 24
  const orderBy = sort === "hot"
    ? { recommendations: { _count: "desc" as const } }
    : { updatedAt: "desc" as const }

  const where: any = {}
  const andConditions: any[] = []

  if (q) {
    andConditions.push({
      OR: [
        { title: { contains: q } },
        { author: { contains: q } },
        { description: { contains: q } },
        { tags: { some: { tag: { name: { contains: q } } } } },
        { uploader: { username: { contains: q } } },
      ],
    })
  }
  if (type && type !== "ALL") {
    andConditions.push({ type })
  }
  if (tag) {
    andConditions.push({
      tags: { some: { tag: { name: tag } } },
    })
  }

  if (andConditions.length > 0) {
    where.AND = andConditions
  }

  const [resources, totalCount] = await Promise.all([
    prisma.resource.findMany({
      where,
      orderBy,
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        uploader: { select: { id: true, username: true, avatar: true } },
        tags: { include: { tag: true } },
        _count: { select: { recommendations: true, comments: true } },
      },    }),
    prisma.resource.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  function buildUrl(params: { type?: string; q?: string; tag?: string; page?: number; sort?: string }) {
    const parts: string[] = []
    if (params.type && params.type !== "ALL") parts.push(`type=${params.type}`)
    if (params.q) parts.push(`q=${encodeURIComponent(params.q)}`)
    if (params.tag) parts.push(`tag=${encodeURIComponent(params.tag)}`)
    if (params.page && params.page > 1) parts.push(`page=${params.page}`)
    if (params.sort && params.sort !== "new") parts.push(`sort=${params.sort}`)
    return parts.length ? `/explore?${parts.join("&")}` : "/explore"
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">探索资源</h1>
        <p className="mt-1.5 text-muted-foreground">浏览天央图书馆的所有资源</p>
      </div>

      <form className="mb-6 flex gap-2">
        <input type="hidden" name="type" value={type ?? "ALL"} />
        {tag && <input type="hidden" name="tag" value={tag} />}
        <Input
          name="q"
          placeholder="搜索标题、作者、描述或标签..."
          defaultValue={q ?? ""}
          className="max-w-sm bg-background"
        />
        <Button type="submit">搜索</Button>
      </form>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {[
          { value: "ALL", label: "全部" },
          { value: "BOOK", label: "电子书" },
          { value: "COMIC", label: "漫画" },
        ].map((t) => (
          <Link
            key={t.value}
            href={buildUrl({ type: t.value, q: q ?? "", tag })}
          >
            <Badge variant={type === t.value || (!type && t.value === "ALL") ? "default" : "secondary"}>
              {t.label}
            </Badge>
          </Link>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">排序：</span>
        {[
          { value: "new", label: "最新" },
          { value: "hot", label: "最热" },
        ].map((s) => (
          <Link key={s.value} href={buildUrl({ type: type ?? "", q: q ?? "", tag, sort: s.value })}>
            <Badge variant={(sort ?? "new") === s.value ? "default" : "secondary"}>
              {s.label}
            </Badge>
          </Link>
        ))}
      </div>

      {tag && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">标签过滤：</span>
          <Badge variant="default" className="gap-1">
            {tag}
            <Link href={buildUrl({ type: type ?? "", q: q ?? "" })} className="ml-0.5 hover:text-destructive">✕</Link>
          </Badge>
        </div>
      )}

      {resources.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium">没有找到资源</p>
            <p className="mt-1 text-sm text-muted-foreground">尝试其他搜索条件</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {resources.map((resource) => (
            <div key={resource.id} className="group relative">
              <Link href={`/resource/${resource.id}`} className="absolute inset-0 z-10">
                <span className="sr-only">{resource.title}</span>
              </Link>
              <Card className="h-full overflow-hidden border-transparent shadow-sm transition-all group-hover:border-border group-hover:shadow-md">
                {resource.coverImage ? (
                  <ImagePreview src={resource.coverImage} alt={resource.title} className="block">
                    <img
                      src={resource.coverImage}
                      alt={resource.title}
                      loading="lazy" decoding="async"
                      className="h-44 w-full object-contain transition-transform duration-300 group-hover:scale-105 bg-muted/30"
                    />
                  </ImagePreview>
                ) : (
                  <div className="flex h-44 items-center justify-center bg-gradient-to-br from-secondary to-secondary/50 transition-colors group-hover:from-secondary/80">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">{typeIcons[resource.type]}</span>
                      <span className="text-xs font-medium text-muted-foreground">{typeLabels[resource.type]}</span>
                    </div>
                  </div>
                )}
                <CardContent className="p-4">
                  <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">{resource.title}</h3>
                  {resource.author && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{resource.author}</p>
                  )}
                  {resource.comicMangaId && (
                    <Badge variant="outline" className="mt-1 text-[10px] text-muted-foreground">在线漫画</Badge>
                  )}
                  <div className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <Link href={`/profile/${resource.uploader.username}`} className="relative z-20 flex items-center gap-2 hover:text-foreground">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={resource.uploader.avatar ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {resource.uploader.username.slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{resource.uploader.username}</span>
                    </Link>
                    <span className="opacity-40">·</span>
                    <span>{resource._count.recommendations} 推荐</span>
                    <span className="opacity-40">·</span>
                    <span>{resource._count.comments} 评论</span>
                  </div>
                  {resource.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {resource.tags.slice(0, 3).map((rt) => (
                        <Link
                          key={rt.tag.id}
                          href={buildUrl({ tag: rt.tag.name, type: type ?? "", q: q ?? "" })}
                          className="relative z-20"
                        >
                          <Badge
                            variant={tag === rt.tag.name ? "default" : "outline"}
                            className="text-xs font-normal hover:bg-primary/10"
                          >
                            {rt.tag.name}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          {currentPage > 1 && (
            <Link href={buildUrl({ type: type ?? "", q: q ?? "", tag, page: currentPage - 1 })}>
              <Button variant="outline" size="sm">上一页</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={buildUrl({ type: type ?? "", q: q ?? "", tag, page: currentPage + 1 })}>
              <Button variant="outline" size="sm">下一页</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
