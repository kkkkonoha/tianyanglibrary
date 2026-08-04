import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FeedbackAdminList } from "./feedback-admin-list"
import { isFeedbackManager } from "@/lib/actions/feedback"
import { FeedbackReportLink } from "./feedback-report-link"

export const dynamic = "force-dynamic"

export default async function AdminFeedbackPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!(await isFeedbackManager())) redirect("/")

  const feedbacks = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { username: true } } },
  })

  const counts = {
    pending: feedbacks.filter((f) => f.status === "pending").length,
    processing: feedbacks.filter((f) => f.status === "processing").length,
    done: feedbacks.filter((f) => f.status === "done").length,
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-muted-foreground hover:underline">
            ← 返回管理面板
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">反馈管理</h1>
          <p className="mt-1.5 text-muted-foreground">
            待处理 {counts.pending} · 处理中 {counts.processing} · 已处理 {counts.done}
          </p>
        </div>
        <FeedbackReportLink />
      </div>

      <FeedbackAdminList feedbacks={feedbacks} />
    </div>
  )
}
