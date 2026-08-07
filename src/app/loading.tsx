import { SkeletonTimeline } from "@/components/skeletons"

export default function HomeLoading() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6">
        <div className="h-8 w-24 animate-pulse rounded bg-muted/50" />
        <div className="mt-2 h-4 w-40 animate-pulse rounded bg-muted/50" />
      </div>
      <div className="mb-6 flex gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-16 animate-pulse rounded-full bg-muted/50" />
        ))}
      </div>
      <SkeletonTimeline />
    </div>
  )
}
