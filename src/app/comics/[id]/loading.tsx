import { SkeletonCard } from "@/components/skeletons"

export default function ComicDetailLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-start gap-4">
        <div className="h-48 w-32 animate-pulse rounded bg-muted/50" />
        <div className="flex-1 space-y-3">
          <div className="h-7 w-2/3 animate-pulse rounded bg-muted/50" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted/50" />
          <div className="h-8 w-28 animate-pulse rounded bg-muted/50" />
        </div>
      </div>
      <div className="mt-8">
        <div className="h-5 w-20 animate-pulse rounded bg-muted/50" />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      </div>
      <div className="mt-8">
        <div className="h-5 w-24 animate-pulse rounded bg-muted/50" />
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
