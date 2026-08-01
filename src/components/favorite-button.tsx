"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"

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
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant={favorited ? "default" : "outline"}
      size={size}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const { toggleFavoriteResource } = await import("@/lib/actions/favorite")
          const result = await toggleFavoriteResource(resourceId)
          if (result?.error) {
            alert(result.error)
            return
          }
          router.refresh()
        })
      }}
    >
      {pending ? "…" : favorited ? "★ 已收藏" : "☆ 收藏"}
      {count > 0 && <span className="ml-1 text-xs opacity-70">{count}</span>}
    </Button>
  )
}
