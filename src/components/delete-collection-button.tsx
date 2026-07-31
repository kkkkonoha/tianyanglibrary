"use client"

import { useRouter } from "next/navigation"
import { ConfirmButton } from "@/components/confirm-button"
import { deleteCollection } from "@/lib/actions/collection"

export function DeleteCollectionButton({ collectionId }: { collectionId: string }) {
  const router = useRouter()

  async function handleDelete() {
    await deleteCollection(collectionId)
    router.push("/collections")
  }

  return (
    <ConfirmButton
      title="删除目录"
      description="确定要删除这个目录吗？目录下的资源不会被删除，但此操作不可撤销。"
      confirmText="删除"
      variant="destructive"
      size="sm"
      onConfirm={handleDelete}
    >
      删除目录
    </ConfirmButton>
  )
}
