import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

export const dynamic = "force-dynamic"

const RANKS = [
  { key: "total", label: "综合" },
  { key: "comment", label: "评论" },
  { key: "recommend", label: "推荐" },
] as const

const RANGES = [
  { key: "week", label: "周" },
  { key: "month", label: "月" },
  { key: "year", label: "年" },
  { key: "all", label: "总" },
] as const

// 北京时间自然周期起点（返回 UTC 时刻，周一为一周起点）
function periodCutoff(range: string): Date | null {
  if (range === "all") return null
  const now = new Date()
  const bj = new Date(now.getTime() + 8 * 3600 * 1000)
  const y = bj.getUTCFullYear()
  const m = bj.getUTCMonth()
  const d = bj.getUTCDate()
  let startBJ: number
  if (range === "week") {
    const dow = bj.getUTCDay()
    startBJ = Date.UTC(y, m, d - ((dow + 6) % 7))
  } else if (range === "month") {
    startBJ = Date.UTC(y, m, 1)
  } else if (range === "year") {
    startBJ = Date.UTC(y, 0, 1)
  } else {
    return null
  }
  return new Date(startBJ - 8 * 3600 * 1000)
}

function rankMedal(i: number) {
  if (i === 0) return "🥇"
  if (i === 1) return "🥈"
  if (i === 2) return "🥉"
  return null
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ rank?: string; range?: string }>
}) {
  const session = await auth()
  const { rank, range } = await searchParams
  const rankKey = RANKS.some((r) => r.key === rank) ? (rank as string) : "total"
  const rangeKey = RANGES.some((r) => r.key === range) ? (range as string) : "week"
  const cutoff = periodCutoff(rangeKey)

  const [comments, recommendations, users] = await Promise.all([
    prisma.comment.findMany({
      where: {
        parentId: null,
        resourceId: { not: null },
        ...(cutoff ? { createdAt: { gte: cutoff } } : {}),
      },
      select: { userId: true },
    }),
    prisma.recommendation.findMany({
      where: cutoff ? { createdAt: { gte: cutoff } } : {},
      select: { userId: true },
    }),
    prisma.user.findMany({ select: { id: true, username: true, avatar: true } }),
  ])

  const commentCount = new Map<string, number>()
  for (const c of comments) commentCount.set(c.userId, (commentCount.get(c.userId) ?? 0) + 1)
  const recommendCount = new Map<string, number>()
  for (const r of recommendations) recommendCount.set(r.userId, (recommendCount.get(r.userId) ?? 0) + 1)

  const userMap = new Map(users.map((u) => [u.id, u]))
  const scored = [...userMap.keys()]
    .map((id) => ({
      user: userMap.get(id)!,
      comments: commentCount.get(id) ?? 0,
      recommends: recommendCount.get(id) ?? 0,
    }))
    .filter((r) => r.comments > 0 || r.recommends > 0)
    .sort((a, b) => {
      // 综合榜：总分 → 评论数 → 推荐数 → 用户名
      if (rankKey === "total") {
        const ta = a.comments + a.recommends
        const tb = b.comments + b.recommends
        if (tb !== ta) return tb - ta
        if (b.comments !== a.comments) return b.comments - a.comments
        if (b.recommends !== a.recommends) return b.recommends - a.recommends
        return a.user.username.localeCompare(b.user.username, "zh-CN")
      }
      // 评论榜 / 推荐榜：主维度 → 另一维度 → 用户名
      const primaryA = rankKey === "comment" ? a.comments : a.recommends
      const primaryB = rankKey === "comment" ? b.comments : b.recommends
      if (primaryB !== primaryA) return primaryB - primaryA
      const secondaryA = rankKey === "comment" ? a.recommends : a.comments
      const secondaryB = rankKey === "comment" ? b.recommends : b.comments
      if (secondaryB !== secondaryA) return secondaryB - secondaryA
      return a.user.username.localeCompare(b.user.username, "zh-CN")
    })

  const top20 = scored.slice(0, 20)
  const myIndex = session?.user ? scored.findIndex((r) => r.user.id === (session.user as { id: string }).id) : -1
  const myRow = myIndex >= 0 ? scored[myIndex] : null

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">排行榜</h1>
      <p className="mt-1.5 text-muted-foreground">按评论与推荐热度，看看谁最活跃</p>

      {/* 榜单切换 */}
      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        {RANKS.map((r) => {
          const active = r.key === rankKey
          return (
            <Link
              key={r.key}
              href={`/leaderboard?rank=${r.key}&range=${rangeKey}`}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {r.label}
            </Link>
          )
        })}
      </div>
      {/* 周期切换 */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {RANGES.map((r) => {
          const active = r.key === rangeKey
          return (
            <Link
              key={r.key}
              href={`/leaderboard?rank=${rankKey}&range=${r.key}`}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {r.label}
            </Link>
          )
        })}
      </div>

      {/* 我的排名 */}
      {myRow && myIndex >= 0 && (
        <Card className="mt-6 border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-primary">#{myIndex + 1}</span>
              <span className="text-sm font-medium">我的排名</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{myRow.comments} 评论</span>
              <span>{myRow.recommends} 推荐</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 榜单 */}
      {top20.length === 0 ? (
        <Card className="mt-6 border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            该周期暂无数据，快去评论或推荐吧
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-2">
          {top20.map((row, i) => {
            const score = rankKey === "comment" ? row.comments : rankKey === "recommend" ? row.recommends : row.comments + row.recommends
            return (
              <Link key={row.user.id} href={`/profile/${row.user.username}`}>
                <Card className="transition-colors hover:border-primary/40 hover:bg-muted/30">
                  <CardContent className="flex items-center gap-3 p-3.5">
                    <span className="w-8 shrink-0 text-center text-lg font-bold tabular-nums">
                      {rankMedal(i) ?? i + 1}
                    </span>
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={row.user.avatar ?? undefined} />
                      <AvatarFallback>{row.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate font-medium">{row.user.username}</span>
                    <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground tabular-nums">
                      <span>{row.comments} 评论</span>
                      <span>{row.recommends} 推荐</span>
                      <span className="font-semibold text-foreground">{score} 分</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
