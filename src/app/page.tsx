import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { $Enums } from "@/generated/prisma/client"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TimelineList } from "@/components/timeline-list"
import { isAdmin } from "@/lib/permissions"
import { ChangelogButton } from "@/components/changelog-button"
import { TimelinePageSize } from "@/components/timeline-page-size"

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 1000

const TABS = [
  { key: "", label: "全部" },
  { key: "UPLOAD", label: "上传" },
  { key: "COMMENT", label: "评论" },
  { key: "RECOMMEND", label: "推荐" },
  { key: "FAVORITE", label: "收藏" },
  { key: "DIR", label: "目录" },
  { key: "ANNOUNCEMENT", label: "公告" },
] as const

const DIR_TYPES: $Enums.ActivityType[] = ["CREATE_COLLECTION", "ADD_TO_COLLECTION"]
const VALID_TYPES: $Enums.ActivityType[] = ["UPLOAD", "COMMENT", "RECOMMEND", "FAVORITE", ...DIR_TYPES, "ANNOUNCEMENT"]

// 与 timeline-list 客户端分组规则一致：同一用户同类型相邻 10 分钟内合并为一组；评论/推荐/公告不合并
const GROUP_WINDOW_MS = 10 * 60 * 1000
const NO_GROUP_TYPES = new Set(["COMMENT", "RECOMMEND", "ANNOUNCEMENT"])

type ServerActivity = {
  id: string
  type: string
  metadata: string | null
  createdAt: Date
  userId: string
  title?: string | null
  pinnedAt?: Date | null
  user: { id: string; username: string; avatar: string | null }
  resource: { id: number; title: string; type: string } | null
  collection: { id: string; title: string } | null
}

function buildGroups(activities: ServerActivity[]) {
  const groups: Array<{ items: ServerActivity[] }> = []
  for (const a of activities) {
    const last = groups[groups.length - 1]
    const aTime = a.createdAt.getTime()
    if (last) {
      const lastItem = last.items[last.items.length - 1]
      const diff = Math.abs(aTime - lastItem.createdAt.getTime())
      if (
        !NO_GROUP_TYPES.has(a.type) &&
        lastItem.userId === a.userId &&
        lastItem.type === a.type &&
        diff <= GROUP_WINDOW_MS
      ) {
        last.items.push(a)
        continue
      }
    }
    groups.push({ items: [a] })
  }
  return groups
}

const emptyLabels: Record<string, string> = {
  UPLOAD: "还没有人上传资源",
  COMMENT: "还没有评论动态",
  RECOMMEND: "还没有推荐动态",
  FAVORITE: "还没有收藏动态",
  DIR: "还没有目录动态",
  ANNOUNCEMENT: "还没有公告",
}

// 构造带 types/size/page 的链接
function buildHref(types: string[], size: number, page = 1) {
  const params = new URLSearchParams()
  if (types.length > 0) params.set("types", types.join(","))
  if (size !== DEFAULT_PAGE_SIZE) params.set("size", String(size))
  if (page > 1) params.set("page", String(page))
  const qs = params.toString()
  return qs ? `/?${qs}` : "/"
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; types?: string; size?: string }>
}) {
  const session = await auth()
  const { page, type, types, size } = await searchParams
  const currentPage = Math.max(1, parseInt(page ?? "1") || 1)

  // 每页条数：正整数 1~1000，非法回退 20
  const rawSize = parseInt(size ?? "", 10)
  const pageSize = Number.isInteger(rawSize) && rawSize >= 1 && rawSize <= MAX_PAGE_SIZE ? rawSize : DEFAULT_PAGE_SIZE

  // 多选类型（兼容旧 type= 单值）
  const selectedKeys = new Set<string>()
  if (typeof types === "string" && types) {
    for (const k of types.split(",")) {
      if (k && (VALID_TYPES.includes(k as $Enums.ActivityType) || k === "DIR")) selectedKeys.add(k)
    }
  }
  if (selectedKeys.size === 0 && typeof type === "string" && type) {
    if (VALID_TYPES.includes(type as $Enums.ActivityType) || type === "DIR") selectedKeys.add(type)
  }

  // 展开为实际枚举（DIR = 创建目录 + 添加目录）
  const selectedEnums: $Enums.ActivityType[] = []
  for (const k of selectedKeys) {
    if (k === "DIR") selectedEnums.push(...DIR_TYPES)
    else selectedEnums.push(k as $Enums.ActivityType)
  }
  const typeFilter = selectedEnums.length > 0 ? { type: { in: selectedEnums } } : undefined

  const activityInclude = {
    user: { select: { id: true, username: true, avatar: true } },
    resource: { select: { id: true, title: true, type: true } },
    collection: { select: { id: true, title: true } },
  } as const

  // 仅筛选公告时：置顶公告排最前（pinnedAt 优先，再按时间）
  const onlyAnnouncements = selectedKeys.size === 1 && selectedKeys.has("ANNOUNCEMENT")
  const orderBy = onlyAnnouncements
    ? [{ pinnedAt: { sort: "desc", nulls: "last" } as const }, { createdAt: "desc" as const }]
    : { createdAt: "desc" as const }

  // 读取全部符合条件的活动（分批取完），按折叠规则分组后按「卡片数」分页
  const allActivities: ServerActivity[] = []
  let offset = 0
  while (true) {
    const batch = await prisma.activity.findMany({
      where: typeFilter,
      orderBy,
      skip: offset,
      take: 1000,
      include: activityInclude,
    })
    allActivities.push(...batch)
    offset += batch.length
    if (batch.length < 1000) break
  }

  const groups = buildGroups(allActivities)
  const totalCards = groups.length
  const totalPages = Math.max(1, Math.ceil(totalCards / pageSize))
  const startCard = (currentPage - 1) * pageSize
  const activities = groups
    .slice(startCard, startCard + pageSize)
    .flatMap((g) => g.items)
    .map((a) => ({
      id: a.id,
      type: a.type,
      metadata: a.metadata,
      createdAt: a.createdAt.toISOString(),
      userId: a.userId,
      title: a.title,
      pinnedAt: a.pinnedAt ? a.pinnedAt.toISOString() : null,
      user: a.user,
      resource: a.resource,
      collection: a.collection,
    }))

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">动态</h1>
        <p className="mt-1.5 text-muted-foreground">看看大家都在分享什么</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        {TABS.map((tab) => {
          const active = tab.key === "" ? selectedKeys.size === 0 : selectedKeys.has(tab.key)
          return (
            <Link
              key={tab.key}
              href={
                tab.key === ""
                  ? buildHref([], pageSize)
                  : buildHref(
                      active
                        ? [...selectedKeys].filter((k) => k !== tab.key)
                        : [...selectedKeys, tab.key],
                      pageSize
                    )
              }
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
        <TimelinePageSize currentSize={pageSize} />
      </div>

      {activities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-foreground"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <p className="text-lg font-medium">{selectedKeys.size === 1 ? emptyLabels[[...selectedKeys][0]] ?? "还没有任何动态" : "还没有任何动态"}</p>
            {selectedKeys.has("ANNOUNCEMENT") && selectedKeys.size === 1 ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">版本更新和站务公告会发布在这里</p>
                {isAdmin(session) && (
                  <Link href="/admin" className="mt-5">
                    <span className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                      前往管理面板发布公告
                    </span>
                  </Link>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <TimelineList
          activities={activities}
          currentUserId={session?.user ? (session.user as { id: string }).id : undefined}
          isAdminUser={isAdmin(session)}
        />
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          {currentPage > 1 && (
            <Link href={buildHref([...selectedKeys], pageSize, currentPage - 1)}>
              <Button variant="outline" size="sm">上一页</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={buildHref([...selectedKeys], pageSize, currentPage + 1)}>
              <Button variant="outline" size="sm">下一页</Button>
            </Link>
          )}
        </div>
      )}

      <ChangelogButton />
    </div>
  )
}
