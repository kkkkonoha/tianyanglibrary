import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { LatestChapter } from "@/components/latest-chapter"
import { ResourceTypeIcon, ResourceTypeLabel } from "@/components/resource-type"
import { READING_STATUS_LABELS } from "@/lib/reading-status-constants"

export const dynamic = "force-dynamic"

const STATUS_OPTIONS = [
  { value: "WANT", label: READING_STATUS_LABELS.WANT },
  { value: "READING", label: READING_STATUS_LABELS.READING },
  { value: "READ", label: READING_STATUS_LABELS.READ },
  { value: "DROPPED", label: READING_STATUS_LABELS.DROPPED },
] as const

export default async function ReadingShelfPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const params = await searchParams
  const status = STATUS_OPTIONS.some((option) => option.value === params.status)
    ? params.status as (typeof STATUS_OPTIONS)[number]["value"]
    : "WANT"

  const entries = await prisma.readingStatusEntry.findMany({
    where: { userId: session.user.id as string, status },
    include: {
      resource: {
        include: { uploader: { select: { username: true } }, bindings: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">阅读资源</h1>
      <p className="mt-1.5 text-muted-foreground">按阅读状态查看你的资源</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => (
          <Link
            key={option.value}
            href={`/favorites?status=${option.value}`}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              status === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <Card className="mt-8 border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            暂无“{READING_STATUS_LABELS[status]}”状态的资源
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {entries.map((entry, i) => {
            const resource = entry.resource
            const href = resource.type === "COMIC" && resource.comicMangaId
              ? `/comics/${resource.comicMangaId}`
              : `/resource/${resource.id}`
            return (
              <Link key={entry.id} href={href} className="animate-lib-rise-in" style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }}>
                <Card className="group h-full overflow-hidden transition-all hover:border-primary/40 hover:shadow-md">
                  <div className="relative aspect-[3/4] overflow-hidden bg-muted/30">
                    {resource.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resource.coverImage} alt={resource.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground/30">
                        <ResourceTypeIcon type={resource.type} className="h-10 w-10" />
                      </div>
                    )}
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                      <ResourceTypeLabel type={resource.type} iconClassName="h-3 w-3" />
                    </span>
                  </div>
                  <CardContent className="p-2.5">
                    <p className="truncate text-sm font-medium">{resource.title}</p>
                    {resource.type === "COMIC" && resource.comicMangaId ? (
                      <LatestChapter mangaId={resource.comicMangaId} />
                    ) : (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{resource.author ?? resource.uploader.username}</p>
                    )}
                    {entry.note && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{entry.note}</p>}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
