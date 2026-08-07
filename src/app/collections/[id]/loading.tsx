import { SkeletonTimeline } from "@/components/skeletons"

export default function CollectionDetailLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="h-4 w-24 animate-pulse rounded bg-muted/50" />
      <div className="mt-4 space-y-2">
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted/50" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted/50" />
      </div>
      <div className="my-6 h-px bg-muted" />
      <SkeletonTimeline />
    </div>
  )
}
