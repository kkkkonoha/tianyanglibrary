"use client"

import { useRouter } from "next/navigation"
import { ConfirmButton } from "@/components/confirm-button"
import { deleteActivity } from "@/lib/actions/activity"
import { X } from "lucide-react"

export function DeleteActivityButton({ activityId }: { activityId: string }) {
  const router = useRouter()

  async function handleDelete() {
    await deleteActivity(activityId)
    router.refresh()
  }

  return (
    <ConfirmButton
      title="删除动态"
      description="确定要删除这条动态吗？此操作不可撤销。"
      confirmText="删除"
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-destructive"
      onConfirm={handleDelete}
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </ConfirmButton>
  )
}
