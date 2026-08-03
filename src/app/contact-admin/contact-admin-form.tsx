"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { sendContactMessage } from "@/lib/actions/contact"

export function ContactAdminForm() {
  const [result, formAction] = useActionState(sendContactMessage, null)

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">联系管理员</CardTitle>
        <CardDescription>忘记密码等问题可留言给管理员，管理员会尽快处理</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {result?.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{result.error}</div>
          )}
          {result?.success && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
              {result.message}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="username">你的用户名 *</Label>
            <Input id="username" name="username" type="text" placeholder="用于定位你的账号" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qq">QQ 号（可选）</Label>
            <Input id="qq" name="qq" type="text" placeholder="方便管理员核对" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">留言内容 *</Label>
            <Textarea
              id="message"
              name="message"
              rows={3}
              placeholder="例如：忘记密码了，请帮我重置"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button type="submit" className="w-full">发送给管理员</Button>
          <p className="text-sm text-muted-foreground">
            已设置安全问题的用户可{" "}
            <Link href="/forgot-password" className="text-primary underline underline-offset-4">
              自助找回密码
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
