"use client"

import { useState } from "react"

// 长文本截断 + 展开/收起。超限后默认显示前 MAX_CHARS 字，点击「展开」显示全文。
export const MAX_CHARS = 100

export function ExpandableText({ text, className }: { text: string; className?: string }) {
  const [expanded, setExpanded] = useState(false)

  if (text.length <= MAX_CHARS) {
    return <span className={className}>{text}</span>
  }

  return (
    <span className={className}>
      {expanded ? text : `${text.slice(0, MAX_CHARS)}…`}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="ml-1 shrink-0 text-primary underline underline-offset-2 hover:opacity-80"
      >
        {expanded ? "收起" : "展开"}
      </button>
    </span>
  )
}
