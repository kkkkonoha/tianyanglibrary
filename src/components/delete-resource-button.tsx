"use client"

import { useRouter } from "next/navigation"
import { ConfirmButton } from "@/components/confirm-button"
import { deleteResource } from "@/lib/actions/resource"

export function DeleteResourceButton({ resourceId }: { resourceId: string }) {
  const router = useRouter()

  async function handleDelete() {
    const formData = new FormData()
    formData.set("id", resourceId)
    await deleteResource(formData)
    router.refresh()
  }

  return (
    <ConfirmButton
      title="删除资源"
      description="确定要删除这个资源吗？此操作不可撤销。"
      confirmText="删除"
      variant="destructive"
      size="sm"
      onConfirm={handleDelete}
    >
      删除
    </ConfirmButton>
  )
}
