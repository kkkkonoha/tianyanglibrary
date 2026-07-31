"use client"

import { useRouter } from "next/navigation"
import { markOneNotificationRead } from "@/lib/actions/notification"

export function NotificationItem({
  id,
  content,
  link,
  read,
  createdAt,
}: {
  id: string
  content: string
  link: string | null
  read: number
  createdAt: string
}) {
  const router = useRouter()

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    if (!read) {
      await markOneNotificationRead(id)
    }
    if (link) router.push(link)
    else router.refresh()
  }

  return (
    <a href={link ?? "#"} onClick={handleClick}>
      <div className={`rounded-xl border p-4 transition-colors hover:bg-muted/50 ${!read ? "border-primary/30 bg-primary/[0.02]" : "bg-card"}`}>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className={`text-sm ${!read ? "font-medium" : "text-muted-foreground"}`}>
              {content}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground/60">
              {new Date(createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
            </p>
          </div>
          {!read && <span className="ml-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </div>
      </div>
    </a>
  )
}
