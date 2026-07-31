"use client"

import { useState } from "react"

export function ImagePreview({
  src,
  alt,
  className,
  children,
}: {
  src: string
  alt: string
  className?: string
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        {children ?? <img src={src} alt={alt} className="w-full h-full object-cover" />}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <img
            src={src}
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
