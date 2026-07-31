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

  async function handleConfirm() {
    setLoading(true)
    await onConfirm()
    setLoading(false)
    setOpen(false)
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
