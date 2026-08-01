"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DeleteActivityButton } from "@/components/delete-activity-button"

interface TimelineActivity {
  id: string
  type: string
  metadata: string | null
  createdAt: string
  userId: string
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
}

const resourceTypeLabels: Record<string, string> = {
  BOOK: "📖 电子书",
  COMIC: "📘 漫画",
}

// 服务端已按时间倒序排列；按 (userId, type) 相邻时间窗口分组。
// 组 key 取组内最老一条的时间桶，保证新动态并入时 key 稳定（展开状态不重置）。
function buildGroups(activities: TimelineActivity[]): ActivityGroup[] {
  const groups: ActivityGroup[] = []
  for (const a of activities) {
    const last = groups[groups.length - 1]
    const aTime = Date.parse(a.createdAt)
    if (last) {
      const lastItem = last.items[last.items.length - 1]
      if (
        lastItem.userId === a.userId &&
        lastItem.type === a.type &&
        aTime - Date.parse(lastItem.createdAt) <= GROUP_WINDOW_MS
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
      {activity.type === "RECOMMEND" && activity.metadata && (
        <CardContent className="pt-0">
          <div className="rounded-lg border border-primary/10 bg-primary/[0.03] p-3 text-sm italic leading-relaxed text-foreground/80">
            &ldquo;{activity.metadata}&rdquo;
          </div>
        </CardContent>
      )}
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
      {groups.map((group) => {
        const collapsed = group.items.length > 1 && !expanded.has(group.key)
        return (
          <div key={group.key} className="space-y-3">
            {group.items.map((activity, i) => {
              if (i > 0 && collapsed) return null
              return (
                <div key={activity.id}>
                  <div className="relative">
                    {canManage(activity) && (
                      <div className="absolute right-1 top-3 z-10 opacity-50 transition-opacity hover:opacity-100">
                        <DeleteActivityButton activityId={activity.id} />
                      </div>
                    )}
                    <ActivityCard activity={activity} />
                  </div>
                  {i === 0 && group.items.length > 1 && (
                    <button
                      onClick={() => toggle(group.key)}
                      className="mt-1.5 ml-12 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      {collapsed ? `+${group.items.length - 1} 条动态` : `收起 ${group.items.length - 1} 条`}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
