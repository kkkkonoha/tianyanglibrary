import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { $Enums } from "@/generated/prisma/client"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TimelineList } from "@/components/timeline-list"
import { isAdmin } from "@/lib/permissions"
import { ChangelogButton } from "@/components/changelog-button"

const PAGE_SIZE = 20

const TABS = [
  { key: "", label: "全部" },
  { key: "UPLOAD", label: "上传" },
  { key: "COMMENT", label: "评论" },
  { key: "RECOMMEND", label: "推荐" },
  { key: "FAVORITE", label: "收藏" },
  { key: "DIR", label: "目录" },
] as const

const DIR_TYPES: $Enums.ActivityType[] = ["CREATE_COLLECTION", "ADD_TO_COLLECTION"]
const VALID_TYPES: $Enums.ActivityType[] = ["UPLOAD", "COMMENT", "RECOMMEND", "FAVORITE", ...DIR_TYPES]

const emptyLabels: Record<string, string> = {
  UPLOAD: "还没有人上传资源",
  COMMENT: "还没有评论动态",
  RECOMMEND: "还没有推荐动态",
  FAVORITE: "还没有收藏动态",
  DIR: "还没有目录动态",
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>
}) {
  const session = await auth()
  const { page, type } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? "1") || 1)

  const typeKey = typeof type === "string" ? type : ""
  const isDirTab = typeKey === "DIR"
  const typeFilter = isDirTab
    ? { type: { in: DIR_TYPES } }
    : (VALID_TYPES as readonly string[]).includes(typeKey)
      ? { type: typeKey as $Enums.ActivityType }
      : undefined

  const totalCount = await prisma.activity.count({ where: typeFilter })
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const activities = await prisma.activity.findMany({
    where: typeFilter,
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">动态</h1>
        <p className="mt-1.5 text-muted-foreground">看看大家都在分享什么</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        {TABS.map((tab) => {
          const active = tab.key === typeKey
          return (
            <Link
              key={tab.key}
              href={tab.key ? `/?type=${tab.key}` : "/"}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {activities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-foreground"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <p className="text-lg font-medium">{emptyLabels[typeKey] ?? "还没有任何动态"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              成为第一个分享的人吧！
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
        <TimelineList
          activities={activities.map((a) => ({
            id: a.id,
            type: a.type,
            metadata: a.metadata,
            createdAt: a.createdAt.toISOString(),
            userId: a.userId,
            user: a.user,
            resource: a.resource,
            collection: a.collection,
          }))}
          currentUserId={session?.user ? (session.user as { id: string }).id : undefined}
          isAdminUser={isAdmin(session)}
        />
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          {currentPage > 1 && (
            <Link href={`/?type=${typeKey}&page=${currentPage - 1}`}>
              <Button variant="outline" size="sm">上一页</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={`/?type=${typeKey}&page=${currentPage + 1}`}>
              <Button variant="outline" size="sm">下一页</Button>
            </Link>
          )}
        </div>
      )}

      <ChangelogButton />
    </div>
  )
}
