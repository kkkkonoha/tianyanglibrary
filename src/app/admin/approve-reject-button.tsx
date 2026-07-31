"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { approveUser, rejectUser } from "@/lib/actions/admin"

export function ApproveRejectButton({ userId, action }: { userId: string; action: "approve" | "reject" }) {
  const router = useRouter()

  async function handleClick() {
    if (action === "approve") {
      await approveUser(userId)
    } else {
      await rejectUser(userId)
    }
    router.refresh()
  }

  return (
    <Button
      onClick={handleClick}
      variant={action === "approve" ? "default" : "destructive"}
      size="sm"
    >
      {action === "approve" ? "通过" : "拒绝"}
    </Button>
  )
}
