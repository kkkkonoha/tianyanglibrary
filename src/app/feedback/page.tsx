import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { FeedbackForm, FeedbackList } from "./feedback-form"

export const dynamic = "force-dynamic"

export default async function FeedbackPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const feedbacks = await prisma.feedback.findMany({
    where: { userId: session.user.id as string },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">反馈中心</h1>
      <p className="mt-1.5 text-muted-foreground">报告 Bug 或提出功能需求，反馈将直接送达管理员</p>

      <div className="mt-6 space-y-8">
        <FeedbackForm />
        <div>
          <h2 className="mb-3 text-lg font-semibold">我的反馈 ({feedbacks.length})</h2>
          <FeedbackList feedbacks={feedbacks} />
        </div>
      </div>
    </div>
  )
}
