"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { resetForgottenPassword } from "@/lib/actions/forgot"

export function ForgotPasswordForm() {
  const [result, formAction] = useActionState(resetForgottenPassword, null)

  if (result?.success) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-lg font-medium text-green-600">密码已重置</p>
          <p className="text-sm text-muted-foreground">请使用新密码登录</p>
          <Link href="/login">
            <Button>去登录</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">找回密码</CardTitle>
        <CardDescription>验证 QQ 号、用户名与安全答案后重置密码</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {result?.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {result.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="qq">QQ 号</Label>
            <Input id="qq" name="qq" type="text" placeholder="注册用的 QQ 号" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input id="username" name="username" type="text" placeholder="注册时的用户名" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="answer">安全答案</Label>
            <Input id="answer" name="answer" type="text" placeholder="回答注册时设置的安全问题" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">新密码</Label>
            <Input id="newPassword" name="newPassword" type="password" placeholder="至少6个字符" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认新密码</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="再次输入新密码" required />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-3">
          <Button type="submit" className="w-full">重置密码</Button>
          <p className="text-sm text-muted-foreground">
            没设置过安全问题？{" "}
            <Link href="/login" className="text-primary underline underline-offset-4">
              联系管理员重置
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
