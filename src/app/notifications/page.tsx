import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { MarkAllReadButton } from "./mark-all-read"
import { NotificationItem } from "./notification-item"

export default async function NotificationsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const notifications = await prisma.$queryRawUnsafe<Array<{
    id: string
    userId: string
    type: string
    content: string
    link: string | null
    read: number
    createdAt: string
  }>>(
    `SELECT * FROM Notification WHERE userId = ? ORDER BY createdAt DESC LIMIT 50`,
    session.user.id as string
  )

  const unreadCount = notifications.reduce((c, n) => c + (n.read ? 0 : 1), 0)

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">通知</h1>
          <p className="mt-1.5 text-muted-foreground">{unreadCount > 0 ? `${unreadCount} 条未读` : "全部已读"}</p>
        </div>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          暂无通知
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, i) => (
            <div key={notif.id} className="animate-lib-rise-in" style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }}>
              <NotificationItem {...notif} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
