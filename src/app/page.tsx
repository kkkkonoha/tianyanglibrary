import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DeleteActivityButton } from "@/components/delete-activity-button"
import { isAdmin } from "@/lib/permissions"

const PAGE_SIZE = 20

const activityLabels = {
  UPLOAD: "上传了资源",
  RECOMMEND: "推荐了",
  CREATE_COLLECTION: "创建了目录",
  ADD_TO_COLLECTION: "向目录添加了",
  COMMENT: "评论了",
  FAVORITE: "收藏了",
}

const resourceTypeLabels: Record<string, string> = {
  BOOK: "📖 电子书",
  COMIC: "📘 漫画",
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  const { page } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? "1") || 1)

  const totalCount = await prisma.activity.count()
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      resource: { select: { id: true, title: true, type: true } },
      collection: { select: { id: true, title: true } },
    },
  })

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">动态</h1>
        <p className="mt-1.5 text-muted-foreground">
          看看大家都在分享什么
        </p>
      </div>

      {activities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-foreground"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <p className="text-lg font-medium">还没有任何动态</p>
            <p className="mt-1 text-sm text-muted-foreground">
              成为第一个上传资源的人吧！
            </p>
            {session ? (
              <Link href="/upload" className="mt-5">
                <span className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                  上传资源
                </span>
              </Link>
            ) : (
              <Link href="/login" className="mt-5">
                <span className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                  登录后开始
                </span>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <Card key={activity.id} className="group relative overflow-hidden border-transparent shadow-sm transition-all hover:border-border hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <Link href={`/profile/${activity.user.username}`}>
                    <Avatar className="h-9 w-9 ring-2 ring-secondary">
                      <AvatarImage src={activity.user.avatar ?? undefined} />
                      <AvatarFallback>
                        {activity.user.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline flex-wrap gap-x-1.5">
                      <Link
                        href={`/profile/${activity.user.username}`}
                        className="font-semibold hover:underline"
                      >
                        {activity.user.username}
                      </Link>
                      <span className="text-sm text-muted-foreground">
                        {activityLabels[activity.type]}
                      </span>
                      {activity.resource && (
                        <Link
                          href={`/resource/${activity.resource.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {activity.resource.title}
                        </Link>
                      )}
                      {activity.collection && (
                        <Link
                          href={`/collections/${activity.collection.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          《{activity.collection.title}》
                        </Link>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      {activity.resource && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {resourceTypeLabels[activity.resource.type] ?? "其他"}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground/70">
                        {new Date(activity.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
                      </span>
                    </div>
                  </div>
                  {session?.user && (isAdmin(session) || activity.userId === (session.user as { id: string }).id) && (
                    <div className="opacity-0 transition-opacity group-hover:opacity-100">
                      <DeleteActivityButton activityId={activity.id} />
                    </div>
                  )}
                </div>
              </CardHeader>
              {activity.type === "RECOMMEND" && activity.metadata && (
                <CardContent className="pt-0">
                  <div className="rounded-lg border border-primary/10 bg-primary/[0.03] p-3 text-sm italic leading-relaxed text-foreground/80">
                    &ldquo;{activity.metadata}&rdquo;
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          {currentPage > 1 && (
            <Link href={`/?page=${currentPage - 1}`}>
              <Button variant="outline" size="sm">上一页</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={`/?page=${currentPage + 1}`}>
              <Button variant="outline" size="sm">下一页</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
