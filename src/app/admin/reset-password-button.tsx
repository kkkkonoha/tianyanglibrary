"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { ConfirmButton } from "@/components/confirm-button"
import { useToast } from "@/components/toast"

// 管理员重置用户密码：生成随机密码并一次性展示（可复制）
export function ResetPasswordButton({ userId, username }: { userId: string; username: string }) {
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ password: string } | null>(null)
  const [copied, setCopied] = useState(false)

  function handleReset() {
    startTransition(async () => {
      const { resetUserPassword } = await import("@/lib/actions/admin")
      const res = await resetUserPassword(userId)
      if (res?.error) {
        toast(res.error, "error")
        return
      }
      if (res?.password) {
        setResult({ password: res.password })
      }
    })
  }

  if (result) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
        <p className="mb-2 font-medium">已为「{username}」生成新密码：</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-background px-2 py-1 font-mono text-base tracking-wider">{result.password}</code>
          <Button
            size="sm"
            variant={copied ? "default" : "outline"}
            onClick={() => {
              navigator.clipboard.writeText(result.password).catch(() => {})
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
          >
            {copied ? "已复制" : "复制"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          请把密码告知用户，登录后可在设置中自行修改。此密码仅显示一次。
        </p>
        <Button size="sm" variant="ghost" className="mt-2" onClick={() => setResult(null)}>
          关闭
        </Button>
      </div>
    )
  }

  return (
    <ConfirmButton
      title="重置密码"
      description={`确定要为「${username}」重置密码吗？将生成随机密码并立即生效。`}
      confirmText="生成密码"
      variant="outline"
      size="sm"
      onConfirm={handleReset}
    >
      {pending ? "生成中..." : "重置密码"}
    </ConfirmButton>
  )
}
