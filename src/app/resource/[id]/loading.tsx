import { SkeletonTimeline } from "@/components/skeletons"

export default function ResourceLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="h-4 w-24 animate-pulse rounded bg-muted/50" />
      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-start gap-4">
            <div className="h-40 w-28 animate-pulse rounded bg-muted/50" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-3/4 animate-pulse rounded bg-muted/50" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted/50" />
              <div className="h-8 w-24 animate-pulse rounded bg-muted/50" />
            </div>
          </div>
          <SkeletonTimeline />
        </div>
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-xl bg-muted/50" />
          <div className="h-32 animate-pulse rounded-xl bg-muted/50" />
        </div>
      </div>
    </div>
  )
}
