"use client"

import Link from "next/link"

export type MonthOption = { key: string; label: string }

export function MonthSelector({
  months,
  value,
  prevHref,
  nextHref,
  hasPrev,
  hasNext,
}: {
  months: MonthOption[]
  value: string
  prevHref: string | null
  nextHref: string | null
  hasPrev: boolean
  hasNext: boolean
}) {
  return (
    <div className="mt-6 flex items-center justify-center gap-3">
      {hasPrev && prevHref ? (
        <Link
          href={prevHref}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="上一月"
        >
          ←
        </Link>
      ) : (
        <span className="p-1.5 text-muted-foreground/30" aria-hidden>
          ←
        </span>
      )}
      <select
        value={value}
        onChange={(e) => {
          window.location.href = `?month=${e.target.value}`
        }}
        className="rounded-md border bg-background px-3 py-1.5 text-base font-semibold outline-none transition-colors focus:border-primary"
      >
        {months.map((m) => (
          <option key={m.key} value={m.key}>
            {m.label}
          </option>
        ))}
      </select>
      {hasNext && nextHref ? (
        <Link
          href={nextHref}
          className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="下一月"
        >
          →
        </Link>
      ) : (
        <span className="p-1.5 text-muted-foreground/30" aria-hidden>
          →
        </span>
      )}
    </div>
  )
}
