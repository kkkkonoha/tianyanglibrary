"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/toast"

export function ImportComicButton({
  mangaId,
  sourceId,
}: {
  mangaId: string
  sourceId: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const { importComicResource } = await import("@/lib/actions/comic")
          const result = await importComicResource(mangaId, sourceId)
          if (result?.error) {
            toast(result.error, "error")
            return
          }
          toast("入库成功", "success")
          router.refresh()
        })
      }}
    >
      {pending ? "入库中…" : "入库"}
    </Button>
  )
}
