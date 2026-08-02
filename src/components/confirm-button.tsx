"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ConfirmButtonProps {
  title?: string
  description?: string
  confirmText?: string
  variant?: "destructive" | "ghost" | "outline"
  size?: "sm" | "default" | "icon"
  className?: string
  children: React.ReactNode
  onConfirm: () => Promise<void> | void
}

export function ConfirmButton({
  title = "确认操作",
  description = "确定要执行此操作吗？此操作不可撤销。",
  confirmText = "确定删除",
  variant = "destructive",
  size = "sm",
  className,
  children,
  onConfirm,
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleConfirm() {
    setLoading(true)
    setError("")
    try {
      await onConfirm()
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger onClick={() => setOpen(true)}>
        <Button variant={variant} size={size} className={className}>
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? "执行中..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
