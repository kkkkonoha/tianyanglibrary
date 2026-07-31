export function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 animate-pulse">
      <div className="h-44 w-full rounded-lg bg-muted/50" />
      <div className="space-y-2">
        <div className="h-4 w-3/4 rounded bg-muted/50" />
        <div className="h-3 w-1/2 rounded bg-muted/50" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-12 rounded-full bg-muted/50" />
        <div className="h-5 w-16 rounded-full bg-muted/50" />
      </div>
    </div>
  )
}

export function SkeletonTimeline() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-muted/50" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-24 rounded bg-muted/50" />
              <div className="h-3 w-48 rounded bg-muted/50" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
