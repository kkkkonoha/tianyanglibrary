"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"

export function ImportComicButton({
  mangaId,
  sourceId,
}: {
  mangaId: string
  sourceId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const { importComicResource } = await import("@/lib/actions/comic")
          const result = await importComicResource(mangaId, sourceId)
          if (result?.error) {
            alert(result.error)
            return
          }
          router.refresh()
        })
      }}
    >
      {pending ? "入库中…" : "入库"}
    </Button>
  )
}
