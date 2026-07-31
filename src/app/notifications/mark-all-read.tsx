"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { markAllNotificationsRead } from "@/lib/actions/notification"

export function MarkAllReadButton() {
  const router = useRouter()

  async function handleClick() {
    await markAllNotificationsRead()
    router.refresh()
  }

  return (
    <Button onClick={handleClick} variant="outline" size="sm">
      全部标为已读
    </Button>
  )
}
