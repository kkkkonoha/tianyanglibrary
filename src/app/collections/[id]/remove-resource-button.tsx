"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { removeFromCollection } from "@/lib/actions/collection"
import { X } from "lucide-react"

export function RemoveResourceButton({ collectionId, resourceId }: { collectionId: string; resourceId: string | number }) {
  const router = useRouter()

  async function handleRemove() {
    await removeFromCollection(collectionId, String(resourceId))
    router.refresh()
  }

  return (
    <Button onClick={handleRemove} variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive">
      <X className="h-4 w-4" aria-hidden="true" />
    </Button>
  )
}
