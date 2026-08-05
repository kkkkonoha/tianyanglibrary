"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

export type ContributionDetail =
  | { type: "recommend"; resourceId?: number; title: string | null | undefined; text?: string }
  | { type: "comment"; resourceId?: number; title: string | null | undefined; text?: string }
  | { type: "upload"; resourceId?: number; title: string | undefined }

export type ContributionRow = {
  user: { id: string; username: string; avatar: string | null }
  score: number
  counts: { recommend: number; comment: number; feedback: number; upload: number }
  details: ContributionDetail[]
}

const DETAIL_LABEL: Record<ContributionDetail["type"], string> = {
  recommend: "推荐",
  comment: "评论",
  upload: "上传",
}

function rankMedal(i: number) {
  if (i === 0) return "🥇"
  if (i === 1) return "🥈"
  if (i === 2) return "🥉"
  return null
}

export function ContributionList({ rows }: { rows: ContributionRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      {rows.map((row, i) => {
        const expanded = expandedId === row.user.id
        return (
          <Card
            key={row.user.id}
            className={`transition-colors ${expanded ? "border-primary/40 bg-muted/30" : "hover:border-primary/40 hover:bg-muted/30"}`}
          >
            <CardContent className="p-0">
              <div
                className="flex cursor-pointer items-center gap-3 p-3.5"
                onClick={() => setExpandedId(expanded ? null : row.user.id)}
              >
                <span className="w-8 shrink-0 text-center text-lg font-bold tabular-nums">
                  {rankMedal(i) ?? i + 1}
                </span>
                <Link
                  href={`/profile/${row.user.username}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={row.user.avatar ?? undefined} />
                    <AvatarFallback>{row.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate font-medium">{row.user.username}</span>
                </Link>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                  <span>推荐 {row.counts.recommend}</span>
                  <span>评论 {row.counts.comment}</span>
                  <span>反馈 {row.counts.feedback}</span>
                  <span>上传 {row.counts.upload}</span>
                  <span className="font-semibold text-foreground">{row.score} 分</span>
                </div>
              </div>
              {expanded && row.details.length > 0 && (
                <div className="space-y-3 border-t px-4 py-3">
                  <div className="text-xs font-medium text-muted-foreground">本月贡献明细</div>
                  {row.details.map((d, j) => (
                    <div key={j} className="text-sm">
                      <div className="flex items-baseline gap-2">
                        <span className="w-10 shrink-0 text-xs text-muted-foreground">{DETAIL_LABEL[d.type]}</span>
                        {d.resourceId ? (
                          <Link
                            href={`/resource/${d.resourceId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="min-w-0 flex-1 font-medium text-primary hover:underline"
                          >
                            {d.title ?? "资源"}
                          </Link>
                        ) : (
                          <span className="min-w-0 flex-1">{d.title ?? "资源"}</span>
                        )}
                      </div>
                      {"text" in d && d.text && (
                        <p className="mt-1 break-words pl-12 text-muted-foreground">{d.text}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
