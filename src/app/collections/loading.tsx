import { SkeletonCard } from "@/components/skeletons"

export default function CollectionsLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <div className="h-8 w-28 animate-pulse rounded bg-muted/50" />
        <div className="mt-2 h-4 w-40 animate-pulse rounded bg-muted/50" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}
