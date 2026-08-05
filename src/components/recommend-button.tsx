"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function RecommendButton({
  resourceId,
  hasRecommended,
  note,
}: {
  resourceId: string | number
  hasRecommended: boolean
  note?: string | null
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
      className={`flex ${hasRecommended ? "flex-col" : "items-center"} gap-2`}
    >
      <input type="hidden" name="resourceId" value={resourceId} />
      <textarea
        name="note"
        defaultValue={hasRecommended ? (note ?? "") : ""}
        placeholder={hasRecommended ? "编辑推荐理由（留空则无推荐语）" : "推荐理由（可选）"}
        rows={3}
        className="min-w-0 flex-1 resize-y rounded-md border px-3 py-1.5 text-sm leading-relaxed"
      />
      {hasRecommended ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="flex-1 whitespace-nowrap sm:flex-none"
            formAction={async (formData: FormData) => {
              const { updateRecommendationNote } = await import("@/lib/actions/recommendation")
              formData.set("resourceId", String(resourceId))
              await updateRecommendationNote(formData)
              router.refresh()
            }}
          >
            保存推荐语
          </Button>
          <Button type="submit" variant="destructive" size="sm" className="flex-1 whitespace-nowrap sm:flex-none">
            取消推荐
          </Button>
        </div>
      ) : (
        <Button type="submit" variant="default" size="sm" className="whitespace-nowrap">
          推荐
        </Button>
      )}
    </form>
  )
}
