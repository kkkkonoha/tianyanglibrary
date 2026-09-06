import { BookMarked, BookOpen } from "lucide-react"

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  BOOK: "电子书",
  COMIC: "漫画",
}

export function ResourceTypeIcon({ type, className = "h-4 w-4" }: { type: string; className?: string }) {
  const Icon = type === "COMIC" ? BookMarked : BookOpen
  return <Icon className={className} aria-hidden="true" />
}

export function ResourceTypeLabel({
  type,
  className = "",
  iconClassName = "h-4 w-4",
}: {
  type: string
  className?: string
  iconClassName?: string
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <ResourceTypeIcon type={type} className={iconClassName} />
      <span>{RESOURCE_TYPE_LABELS[type] ?? "其他"}</span>
    </span>
  )
}
