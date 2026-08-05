import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { ContributionList, type ContributionRow } from "@/components/contribution-list"
import { MonthSelector } from "@/components/month-selector"

export const dynamic = "force-dynamic"

// 贡献分权重（统一管理，调整只改这里）
const POINTS = {
  recommend: 10,
  comment: 10,
  feedback: 2,
  upload: 1,
} as const

const MAX_DETAIL_PER_TYPE = 20

type Month = { y: number; m: number }

function parseMonth(s: string | undefined): Month | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})$/.exec(s)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  if (mo < 1 || mo > 12 || y < 2020 || y > 2100) return null
  return { y, m: mo - 1 }
}

// 北京时间自然月 [start, end)，start 为当月 1 日 00:00，end 为下月 1 日 00:00
function monthRange(y: number, m: number) {
  const start = new Date(Date.UTC(y, m, 1) - 8 * 3600 * 1000)
  const end = new Date(Date.UTC(y, m + 1, 1) - 8 * 3600 * 1000)
  return { start, end }
}

function monthKey(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}`
}

function monthLabel(y: number, m: number) {
  return `${y}年${m + 1}月`
}

function currentMonth(): Month {
  const bj = new Date(Date.now() + 8 * 3600 * 1000)
  return { y: bj.getUTCFullYear(), m: bj.getUTCMonth() }
}

function shiftMonth(month: Month, delta: number): Month {
  const t = month.y * 12 + month.m + delta
  return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 }
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const session = await auth()
  const sp = await searchParams
  const nowMonth = currentMonth()
  const month = parseMonth(sp.month) ?? nowMonth
  const monthSelected = monthKey(month.y, month.m)

  // 最早数据月份 → 当前月，生成可选月份列表（倒序）
  const [minRec, minCmt, minFb, minRes] = await Promise.all([
    prisma.recommendation.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.comment.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.feedback.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    prisma.resource.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ])
  const earliest = [minRec?.createdAt, minCmt?.createdAt, minFb?.createdAt, minRes?.createdAt]
    .filter((d): d is Date => Boolean(d))
    .reduce<Date | null>((acc, d) => (acc && acc < d ? acc : d), null)
  const firstMonth = earliest
    ? (() => {
        const bj = new Date(earliest.getTime() + 8 * 3600 * 1000)
        return { y: bj.getUTCFullYear(), m: bj.getUTCMonth() }
      })()
    : nowMonth

  const months: Month[] = []
  let cur = firstMonth
  while (cur.y < nowMonth.y || (cur.y === nowMonth.y && cur.m <= nowMonth.m)) {
    months.push(cur)
    cur = shiftMonth(cur, 1)
  }
  months.reverse()

  const prevMonth = shiftMonth(month, -1)
  const nextMonth = shiftMonth(month, 1)
  const hasPrev = monthKey(prevMonth.y, prevMonth.m) >= monthKey(firstMonth.y, firstMonth.m)
  const hasNext = monthKey(nextMonth.y, nextMonth.m) <= monthKey(nowMonth.y, nowMonth.m)

  const { start, end } = monthRange(month.y, month.m)

  const [recommendations, comments, feedbacks, resources, users] = await Promise.all([
    prisma.recommendation.findMany({
      where: { note: { not: null }, createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "desc" },
      select: { userId: true, note: true, resource: { select: { title: true } } },
    }),
    prisma.comment.findMany({
      where: { parentId: null, resourceId: { not: null }, createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "desc" },
      select: { userId: true, content: true, resource: { select: { title: true } } },
    }),
    prisma.feedback.findMany({
      where: { withdrawnAt: null, createdAt: { gte: start, lt: end } },
      select: { userId: true },
    }),
    prisma.resource.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: { createdAt: "desc" },
      select: { uploaderId: true, title: true },
    }),
    prisma.user.findMany({ select: { id: true, username: true, avatar: true } }),
  ])

  const scores = new Map<string, number>()
  const counts = new Map<string, ContributionRow["counts"]>()
  const details = new Map<string, ContributionRow["details"]>()

  const ensure = (uid: string) => {
    let c = counts.get(uid)
    if (!c) {
      c = { recommend: 0, comment: 0, feedback: 0, upload: 0 }
      counts.set(uid, c)
    }
    return c
  }
  const addScore = (uid: string, points: number) => scores.set(uid, (scores.get(uid) ?? 0) + points)
  const addDetail = (uid: string, d: ContributionRow["details"][number]) => {
    const arr = details.get(uid) ?? []
    if (arr.length < MAX_DETAIL_PER_TYPE * 3) arr.push(d)
    details.set(uid, arr)
  }

  for (const r of recommendations) {
    const c = ensure(r.userId)
    c.recommend++
    addScore(r.userId, POINTS.recommend)
    addDetail(r.userId, { type: "recommend", title: r.resource?.title, text: r.note ?? undefined })
  }
  for (const c of comments) {
    const cnt = ensure(c.userId)
    cnt.comment++
    addScore(c.userId, POINTS.comment)
    addDetail(c.userId, { type: "comment", title: c.resource?.title, text: c.content })
  }
  for (const f of feedbacks) {
    const cnt = ensure(f.userId)
    cnt.feedback++
    addScore(f.userId, POINTS.feedback)
  }
  for (const r of resources) {
    const cnt = ensure(r.uploaderId)
    cnt.upload++
    addScore(r.uploaderId, POINTS.upload)
    addDetail(r.uploaderId, { type: "upload", title: r.title })
  }

  const userMap = new Map(users.map((u) => [u.id, u]))
  const rows: ContributionRow[] = [...counts.keys()]
    .map((uid) => {
      const c = counts.get(uid)!
      return {
        user: userMap.get(uid)!,
        score: c.recommend * POINTS.recommend + c.comment * POINTS.comment + c.feedback * POINTS.feedback + c.upload * POINTS.upload,
        counts: c,
        details: details.get(uid) ?? [],
      }
    })
    .sort((a, b) => b.score - a.score || a.user.username.localeCompare(b.user.username, "zh-CN"))

  const top20 = rows.slice(0, 20)
  const myIndex = session?.user ? rows.findIndex((r) => r.user.id === (session.user as { id: string }).id) : -1
  const myRow = myIndex >= 0 ? rows[myIndex] : null

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">贡献榜</h1>
      <p className="mt-1.5 text-muted-foreground">
        月度贡献榜：带文字推荐 +{POINTS.recommend}、主楼评论 +{POINTS.comment}、反馈 +{POINTS.feedback}、上传资源 +{POINTS.upload}
      </p>

      {/* 月份切换 */}
      <MonthSelector
        months={months.map((m) => ({ key: monthKey(m.y, m.m), label: monthLabel(m.y, m.m) }))}
        value={monthSelected}
        prevHref={hasPrev ? `?month=${monthKey(prevMonth.y, prevMonth.m)}` : null}
        nextHref={hasNext ? `?month=${monthKey(nextMonth.y, nextMonth.m)}` : null}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />

      {/* 我的排名 */}
      {myRow && myIndex >= 0 && (
        <Card className="mt-6 border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-primary">#{myIndex + 1}</span>
              <span className="text-sm font-medium">我的排名</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{myRow.counts.recommend} 推荐</span>
              <span>{myRow.counts.comment} 评论</span>
              <span>{myRow.counts.upload} 上传</span>
              <span className="font-semibold text-foreground">{myRow.score} 分</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 榜单 */}
      {top20.length === 0 ? (
        <Card className="mt-6 border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            该月份暂无贡献数据，去推荐、评论、上传或反馈吧
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-2">
          <ContributionList rows={top20} />
        </div>
      )}
    </div>
  )
}
