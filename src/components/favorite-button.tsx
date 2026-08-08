"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/toast"

// 收藏/取消收藏按钮（显示状态与收藏数）
export function FavoriteButton({
  resourceId,
  favorited,
  count,
  size = "sm",
}: {
  resourceId: string | number
  favorited: boolean
  count: number
  size?: "sm" | "default"
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()
  const [pulse, setPulse] = useState(0)

  return (
    <Button
      variant={favorited ? "default" : "outline"}
      size={size}
      disabled={pending}
      className={pulse > 0 ? "animate-lib-pulse-once" : undefined}
      onClick={() => {
        startTransition(async () => {
          const { toggleFavoriteResource } = await import("@/lib/actions/favorite")
          const result = await toggleFavoriteResource(resourceId)
          if (result?.error) {
            toast(result.error, "error")
            return
          }
          setPulse((v) => v + 1)
          router.refresh()
        })
      }}
    >
      {pending ? "…" : favorited ? "★ 已收藏" : "☆ 收藏"}
      {count > 0 && <span className="ml-1 text-xs opacity-70">{count}</span>}
    </Button>
  )
}
