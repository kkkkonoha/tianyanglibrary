"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function RecommendButton({
  resourceId,
  hasRecommended,
}: {
  resourceId: string | number
  hasRecommended: boolean
}) {
  const router = useRouter()

  return (
    <form
      action={async (formData: FormData) => {
        const { toggleRecommendation } = await import("@/lib/actions/recommendation")
        formData.set("resourceId", String(resourceId))
        await toggleRecommendation(formData)
        router.refresh()
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="resourceId" value={resourceId} />
      <input
        type="text"
        name="note"
        placeholder="推荐理由（可选）"
        className="flex-1 rounded-md border px-3 py-1 text-sm"
      />
      <Button type="submit" variant={hasRecommended ? "destructive" : "default"} size="sm">
        {hasRecommended ? "取消推荐" : "推荐"}
      </Button>
    </form>
  )
}
