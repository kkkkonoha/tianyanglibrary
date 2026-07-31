"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { setUserRole } from "@/lib/actions/admin"

export function SetRoleButton({ userId, role }: { userId: string; role: string }) {
  const router = useRouter()

  const isAdmin = role === "admin"

  async function handleClick() {
    await setUserRole(userId, isAdmin ? "user" : "admin")
    router.refresh()
  }

  return (
    <Button
      onClick={handleClick}
      variant={isAdmin ? "destructive" : "default"}
      size="sm"
    >
      {isAdmin ? "降为普通用户" : "提升为管理员"}
    </Button>
  )
}
