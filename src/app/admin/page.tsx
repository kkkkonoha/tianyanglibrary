import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isSuperAdmin } from "@/lib/permissions"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SetRoleButton } from "./set-role-button"
import { ApproveRejectButton } from "./approve-reject-button"
import { ResetPasswordButton } from "./reset-password-button"
import { AnnouncementManager } from "./announcement-manager"
import { isFeedbackManager } from "@/lib/actions/feedback"

export default async function AdminPage() {
  const session = await auth()
  if (!isSuperAdmin(session)) redirect("/")

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      _count: { select: { resources: true, activities: true } },
    },
  })

  const roleLabels: Record<string, string> = {
    super_admin: "超级管理员",
    admin: "管理员",
    user: "普通用户",
  }
  const roleVariants: Record<string, "default" | "secondary" | "destructive"> = {
    super_admin: "destructive",
    admin: "default",
    user: "secondary",
  }
  const statusLabels: Record<string, string> = {
    active: "已通过",
    pending: "待审核",
    rejected: "已拒绝",
  }

  const pendingUsers = users.filter(u => u.status === "pending")
  const approvedUsers = users.filter(u => u.status !== "pending")
  const feedbackManager = await isFeedbackManager()

  // 已发布的公告（公告 Tab 置顶优先，按时间倒序）
  const announcements = await prisma.activity.findMany({
    where: { type: "ANNOUNCEMENT" },
    orderBy: [{ pinnedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: { id: true, title: true, createdAt: true, pinnedAt: true },
  })

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">管理面板</h1>
        <p className="mt-1.5 text-muted-foreground">用户管理与审核</p>
        {feedbackManager && (
          <Link href="/admin/feedback" className="mt-3 inline-block">
            <Button variant="outline" size="sm">💬 反馈管理</Button>
          </Link>
        )}
      </div>

      <div className="mb-8 animate-lib-rise-in">
        <h2 className="mb-3 text-lg font-semibold">📢 公告管理</h2>
        <AnnouncementManager initialAnnouncements={announcements.map((a) => ({
          id: a.id,
          title: a.title ?? "公告",
          createdAt: a.createdAt.toISOString(),
          pinnedAt: a.pinnedAt ? a.pinnedAt.toISOString() : null,
        }))} />
      </div>

      {pendingUsers.length > 0 && (
        <div className="mb-8 animate-lib-rise-in" style={{ animationDelay: "120ms" }}>
          <h2 className="mb-3 text-lg font-semibold">待审核用户 ({pendingUsers.length})</h2>
          <div className="space-y-3">
            {pendingUsers.map((user, i) => (
              <Card key={user.id} className="animate-lib-rise-in border-amber-200 bg-amber-50/30 dark:border-amber-900 dark:bg-amber-950/10" style={{ animationDelay: `${180 + Math.min(i, 10) * 60}ms` }}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{user.username}</span>
                      <Badge variant="secondary" className="text-xs">待审核</Badge>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">QQ: {user.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ApproveRejectButton userId={user.id} action="approve" />
                    <ApproveRejectButton userId={user.id} action="reject" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold animate-lib-rise-in" style={{ animationDelay: "120ms" }}>所有用户 ({users.length})</h2>
      <div className="space-y-3">
        {users.map((user, i) => (
          <Card key={user.id} className="animate-lib-rise-in" style={{ animationDelay: `${180 + Math.min(i, 14) * 60}ms` }}>
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{user.username}</span>
                  <Badge variant={roleVariants[user.role] ?? "secondary"}>
                    {roleLabels[user.role] ?? user.role}
                  </Badge>
                  {user.status !== "active" && (
                    <Badge variant="outline" className="text-xs">
                      {statusLabels[user.status] ?? user.status}
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  <span>QQ: {user.email}</span>
                  <span>{user._count.resources} 资源</span>
                  <span>{user._count.activities} 动态</span>
                </div>
              </div>
              {user.role !== "super_admin" && (
                <div className="flex items-center gap-2">
                  <Link href={`/profile/${user.username}`}>
                    <Button variant="outline" size="sm">查看主页</Button>
                  </Link>
                  <ResetPasswordButton userId={user.id} username={user.username} />
                  <SetRoleButton userId={user.id} role={user.role} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
