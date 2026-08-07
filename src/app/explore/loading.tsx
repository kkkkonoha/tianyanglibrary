import { SkeletonCard } from "@/components/skeletons"

export default function ExploreLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-10">
        <div className="h-8 w-32 animate-pulse rounded bg-muted/50" />
        <div className="mt-2 h-4 w-48 animate-pulse rounded bg-muted/50" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}
