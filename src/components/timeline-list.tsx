"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DeleteActivityButton } from "@/components/delete-activity-button"
import { ExpandableText } from "@/components/expandable-text"
import { Markdown } from "@/components/markdown"

interface TimelineActivity {
  id: string
  type: string
  metadata: string | null
  createdAt: string
  userId: string
  title?: string | null
  pinnedAt?: string | null
  user: { id: string; username: string; avatar: string | null }
  resource: { id: number; title: string; type: string } | null
  collection: { id: string; title: string } | null
}

interface ActivityGroup {
  key: string
  items: TimelineActivity[]
}

// 合并时间窗口：同一用户同类型相邻 10 分钟内的动态合并为一组
const GROUP_WINDOW_MS = 10 * 60 * 1000

const activityLabels: Record<string, string> = {
  UPLOAD: "上传了资源",
  RECOMMEND: "推荐了",
  CREATE_COLLECTION: "创建了目录",
  ADD_TO_COLLECTION: "向目录添加了",
  COMMENT: "评论了",
  FAVORITE: "收藏了",
  ANNOUNCEMENT: "发布了公告",
}

const resourceTypeLabels: Record<string, string> = {
  BOOK: "📖 电子书",
  COMIC: "📘 漫画",
}

// 评论/推荐/公告不折叠，始终完整显示
const NO_GROUP_TYPES = new Set(["COMMENT", "RECOMMEND", "ANNOUNCEMENT"])

// 服务端已按时间倒序排列；按 (userId, type) 相邻时间窗口分组（评论/推荐除外）。
// 组 key 取组内最老一条的时间桶，保证新动态并入时 key 稳定（展开状态不重置）。
function buildGroups(activities: TimelineActivity[]): ActivityGroup[] {
  const groups: ActivityGroup[] = []
  for (const a of activities) {
    const last = groups[groups.length - 1]
    const aTime = Date.parse(a.createdAt)
    if (last) {
      const lastItem = last.items[last.items.length - 1]
      const diff = Math.abs(aTime - Date.parse(lastItem.createdAt))
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
    const bucket = Math.floor(aTime / GROUP_WINDOW_MS)
    groups.push({ key: `${a.userId}-${a.type}-${bucket}`, items: [a] })
  }
  return groups
}

function ActivityCard({ activity }: { activity: TimelineActivity }) {
  // 公告卡片：色条 + 徽章 + 标题 + MD 正文完整展示
  if (activity.type === "ANNOUNCEMENT") {
    return (
      <Card className="group relative overflow-hidden border-primary/15 bg-primary/[0.02] shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
        <div className="absolute bottom-0 left-0 top-0 w-1 bg-primary/50" />
        <CardHeader className="pb-3 pl-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="text-xs">📢 公告</Badge>
                {activity.pinnedAt && <Badge variant="outline" className="text-xs">📌 置顶</Badge>}
                <span className="text-xs text-muted-foreground/70">
                  {new Date(activity.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
                </span>
              </div>
              <h3 className="mt-1.5 font-semibold leading-snug">{activity.title ?? "公告"}</h3>
            </div>
          </div>
        </CardHeader>
        {activity.metadata && (
          <CardContent className="pt-0 pl-5">
            <Markdown content={activity.metadata} />
          </CardContent>
        )}
      </Card>
    )
  }

  return (
    <Card className="group relative overflow-hidden border-transparent shadow-sm transition-all hover:border-border hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Link href={`/profile/${activity.user.username}`}>
            <Avatar className="h-9 w-9 ring-2 ring-secondary">
              <AvatarImage src={activity.user.avatar ?? undefined} />
              <AvatarFallback>{activity.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline flex-wrap gap-x-1.5">
              <Link href={`/profile/${activity.user.username}`} className="font-semibold hover:underline">
                {activity.user.username}
              </Link>
              <span className="text-sm text-muted-foreground">{activityLabels[activity.type] ?? activity.type}</span>
              {activity.resource && (
                <Link href={`/resource/${activity.resource.id}`} className="font-medium text-primary hover:underline">
                  {activity.resource.title}
                </Link>
              )}
              {activity.collection && (
                <Link href={`/collections/${activity.collection.id}`} className="font-medium text-primary hover:underline">
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
        </div>
      </CardHeader>
      {(activity.type === "RECOMMEND" || activity.type === "COMMENT") && activity.metadata && (
        <CardContent className="pt-0">
          <div className="rounded-lg border border-primary/10 bg-primary/[0.03] p-3 text-sm italic leading-relaxed text-foreground/80">
            <ExpandableText text={`“${activity.metadata}”`} />
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// 折叠组缩略卡片：显示全部条目标题（时间正序、顿号连接），保留展开入口
function CollapsedGroupCard({ group }: { group: ActivityGroup }) {
  const first = group.items[0]
  const items = [...group.items].reverse()
  const withResource = items.filter((a) => a.resource || a.collection)
  return (
    <Card className="group relative overflow-hidden border-transparent shadow-sm transition-all hover:border-border hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Link href={`/profile/${first.user.username}`}>
            <Avatar className="h-9 w-9 ring-2 ring-secondary">
              <AvatarImage src={first.user.avatar ?? undefined} />
              <AvatarFallback>{first.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              <Link href={`/profile/${first.user.username}`} className="font-semibold hover:underline">
                {first.user.username}
              </Link>
              <span className="text-sm text-muted-foreground">{activityLabels[first.type] ?? first.type}</span>
              {withResource.length === 0 && (
                <span className="font-medium text-muted-foreground">
                  {group.items.length} 个条目
                </span>
              )}
              {withResource.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && <span className="text-muted-foreground">、</span>}
                  {a.resource && (
                    <Link href={`/resource/${a.resource.id}`} className="font-medium text-primary hover:underline">
                      {a.resource.title}
                    </Link>
                  )}
                  {!a.resource && a.collection && (
                    <Link href={`/collections/${a.collection.id}`} className="font-medium text-primary hover:underline">
                      《{a.collection.title}》
                    </Link>
                  )}
                  {!a.resource && !a.collection && (
                    <span className="text-muted-foreground">（条目已删除）</span>
                  )}
                </span>
              ))}
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground/70">
              {group.items.length} 条动态
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}

export function TimelineList({
  activities,
  currentUserId,
  isAdminUser,
}: {
  activities: TimelineActivity[]
  currentUserId?: string
  isAdminUser: boolean
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const groups = useMemo(() => buildGroups(activities), [activities])

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const canManage = (a: TimelineActivity) => isAdminUser || a.userId === currentUserId

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => {
        const collapsed = group.items.length > 1 && !expanded.has(group.key)
        const first = group.items[0]
        return (
          <div key={group.key} className="space-y-3 animate-lib-rise-in" style={{ animationDelay: `${Math.min(gi, 12) * 60}ms` }}>
            <div className="relative">
              {canManage(first) && (
                <div className="absolute right-1 top-3 z-10 opacity-50 transition-opacity hover:opacity-100">
                  <DeleteActivityButton activityId={first.id} />
                </div>
              )}
              {collapsed ? <CollapsedGroupCard group={group} /> : <ActivityCard activity={first} />}
            </div>
            {collapsed && (
              <button
                onClick={() => toggle(group.key)}
                className="mt-1.5 ml-12 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                展开全部 {group.items.length} 条
              </button>
            )}
            {group.items.length > 1 && (
              <div className="lib-collapse" data-open={!collapsed}>
                <div className="space-y-3">
                  {group.items.slice(1).map((a) => (
                    <div key={a.id} className="relative">
                      {canManage(a) && (
                        <div className="absolute right-1 top-3 z-10 opacity-50 transition-opacity hover:opacity-100">
                          <DeleteActivityButton activityId={a.id} />
                        </div>
                      )}
                      <ActivityCard activity={a} />
                    </div>
                  ))}
                  <button
                    onClick={() => toggle(group.key)}
                    className="mt-1.5 ml-12 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    收起 {group.items.length - 1} 条
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
