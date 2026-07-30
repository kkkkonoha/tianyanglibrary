import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const activityLabels = {
  UPLOAD: "上传了资源",
  RECOMMEND: "推荐了",
  CREATE_COLLECTION: "创建了书单",
  ADD_TO_COLLECTION: "向书单添加了",
  COMMENT: "评论了",
}

const resourceTypeLabels: Record<string, string> = {
  BOOK: "📖 电子书",
  COMIC: "📘 漫画",
  VIDEO: "🎬 视频",
  OTHER: "📁 其他",
}

export default async function HomePage() {
  const session = await auth()

  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      resource: { select: { id: true, title: true, type: true } },
      collection: { select: { id: true, title: true } },
    },
  })

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">动态</h1>
        <p className="mt-2 text-muted-foreground">
          看看大家都在分享什么
        </p>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg text-muted-foreground">还没有任何动态</p>
            <p className="mt-1 text-sm text-muted-foreground">
              成为第一个上传资源的人吧！
            </p>
            {session ? (
              <Link href="/upload" className="mt-4">
                <span className="text-primary underline">上传资源</span>
              </Link>
            ) : (
              <Link href="/login" className="mt-4">
                <span className="text-primary underline">登录后开始</span>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <Card key={activity.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${activity.user.username}`}>
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={activity.user.avatar ?? undefined} />
                      <AvatarFallback>
                        {activity.user.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <Link
                        href={`/profile/${activity.user.username}`}
                        className="font-medium hover:underline"
                      >
                        {activity.user.username}
                      </Link>
                      <span className="text-sm text-muted-foreground">
                        {activityLabels[activity.type]}
                      </span>
                      {activity.resource && (
                        <Link
                          href={`/resource/${activity.resource.id}`}
                          className="font-medium hover:underline"
                        >
                          {activity.resource.title}
                        </Link>
                      )}
                      {activity.collection && (
                        <Link
                          href={`/collections/${activity.collection.id}`}
                          className="font-medium hover:underline"
                        >
                          《{activity.collection.title}》
                        </Link>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {activity.resource && (
                        <Badge variant="secondary" className="text-xs">
                          {resourceTypeLabels[activity.resource.type] ?? "其他"}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              {activity.type === "RECOMMEND" && activity.metadata && (
                <CardContent className="pt-0">
                  <div className="rounded-md bg-muted p-3 text-sm italic">
                    &ldquo;{activity.metadata}&rdquo;
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
