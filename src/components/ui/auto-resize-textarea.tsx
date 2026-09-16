"use client"

import { useCallback, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

type AutoResizeTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  minRows?: number
  maxHeight?: number
}

function AutoResizeTextarea({
  className,
  minRows = 2,
  maxHeight = 240,
  onInput,
  onKeyDown,
  ...props
}: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = "auto"
    const lineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight) || 24
    const minHeight = lineHeight * minRows + 16
    const nextHeight = Math.max(minHeight, textarea.scrollHeight)
    textarea.style.height = `${Math.min(nextHeight, maxHeight)}px`
    textarea.style.overflowY = nextHeight > maxHeight ? "auto" : "hidden"
  }, [maxHeight, minRows])

  useEffect(() => {
    resize()
    const frame = window.requestAnimationFrame(resize)
    return () => window.cancelAnimationFrame(frame)
  }, [resize])

  return (
    <textarea
      ref={textareaRef}
      className={cn("resize-none", className)}
      onInput={(event) => {
        resize()
        onInput?.(event)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault()
          event.currentTarget.form?.requestSubmit()
        }
      }}
      {...props}
    />
  )
}

export { AutoResizeTextarea }
