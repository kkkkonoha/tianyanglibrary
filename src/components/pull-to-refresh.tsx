"use client"

import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { isNativeApp } from "@/lib/native"

const TRIGGER_DISTANCE = 72
const MAX_PULL_DISTANCE = 112

export function PullToRefresh({ children }: { children: ReactNode }) {
  const [distance, setDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const distanceRef = useRef(0)
  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const canPullRef = useRef(false)
  const pullingRef = useRef(false)
  const refreshingRef = useRef(false)

  useEffect(() => {
    if (!isNativeApp()) return

    const updateDistance = (value: number) => {
      distanceRef.current = value
      setDistance(value)
    }

    const resetGesture = () => {
      startXRef.current = null
      startYRef.current = null
      canPullRef.current = false
      pullingRef.current = false
      updateDistance(0)
    }

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || window.scrollY > 0 || event.touches.length !== 1) {
        resetGesture()
        return
      }

      const target = event.target
      if (target instanceof Element && target.closest("input, textarea, select, button, a, [data-no-pull-to-refresh]")) {
        resetGesture()
        return
      }

      const touch = event.touches[0]
      startXRef.current = touch.clientX
      startYRef.current = touch.clientY
      canPullRef.current = true
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!canPullRef.current || startXRef.current === null || startYRef.current === null || event.touches.length !== 1) return

      if (window.scrollY > 0) {
        resetGesture()
        return
      }

      const touch = event.touches[0]
      const deltaX = touch.clientX - startXRef.current
      const deltaY = touch.clientY - startYRef.current

      if (deltaY <= 0 || Math.abs(deltaX) > Math.abs(deltaY)) {
        resetGesture()
        return
      }

      const nextDistance = Math.min(MAX_PULL_DISTANCE, Math.max(0, (deltaY - 4) * 0.55))
      if (nextDistance <= 0) return

      pullingRef.current = true
      updateDistance(nextDistance)
      event.preventDefault()
    }

    const onTouchEnd = () => {
      if (!pullingRef.current) {
        resetGesture()
        return
      }

      const shouldRefresh = distanceRef.current >= TRIGGER_DISTANCE
      resetGesture()

      if (!shouldRefresh) return

      refreshingRef.current = true
      setRefreshing(true)
      updateDistance(TRIGGER_DISTANCE)
      window.setTimeout(() => window.location.reload(), 120)
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onTouchEnd, { passive: true })
    window.addEventListener("touchcancel", onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [])

  const progress = Math.min(1, distance / TRIGGER_DISTANCE)

  return (
    <>
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 z-[100] flex size-9 items-center justify-center rounded-full border bg-background/95 text-primary shadow-lg backdrop-blur transition-[opacity,transform]"
        style={{
          top: "env(safe-area-inset-top, 0px)",
          opacity: refreshing || distance > 0 ? 1 : 0,
          transform: `translate(-50%, ${Math.max(8, distance) - 44}px)`,
        }}
      >
        {refreshing ? (
          <span className="size-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: `rotate(${progress * 180}deg)` }}
          >
            <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4" />
            <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" />
          </svg>
        )}
      </div>
    </>
  )
}
