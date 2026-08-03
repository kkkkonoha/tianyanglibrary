"use client"

import { useEffect, useActionState } from "react"
import { useRouter } from "next/navigation"
import { register } from "@/lib/actions/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function RegisterPage() {
  const router = useRouter()
  const [result, formAction] = useActionState(register, null)

  useEffect(() => {
    if (result?.success) {
      router.push("/login?registered=pending")
    }
  }, [result, router])

  if (result?.success) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">注册成功</p>
          <p className="mt-2 text-sm text-muted-foreground">请等待管理员审核通过后方可登录</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">注册账号</CardTitle>
          <CardDescription>加入天央图书馆</CardDescription>
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
              <Input id="qq" name="qq" type="text" placeholder="你的 QQ 号" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input id="username" name="username" type="text" placeholder="你的用户名" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input id="password" name="password" type="password" placeholder="至少6个字符" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="再次输入密码" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="securityQuestion">安全问题</Label>
              <select
                id="securityQuestion"
                name="securityQuestion"
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                defaultValue=""
              >
                <option value="" disabled>请选择安全问题（或自行填写）</option>
                <option value="你的小学名称是什么？">你的小学名称是什么？</option>
                <option value="你最喜欢的书叫什么？">你最喜欢的书叫什么？</option>
                <option value="你的母亲的名字是什么？">你的母亲的名字是什么？</option>
                <option value="你的第一只宠物叫什么？">你的第一只宠物叫什么？</option>
                <option value="你的出生城市是哪里？">你的出生城市是哪里？</option>
                <option value="你最难忘的旅行目的地是哪里？">你最难忘的旅行目的地是哪里？</option>
              </select>
              <Input id="securityQuestionCustom" name="securityQuestionCustom" type="text" placeholder="或自定义安全问题" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="securityAnswer">安全答案</Label>
              <Input id="securityAnswer" name="securityAnswer" type="text" placeholder="至少2个字符（用于找回密码）" required />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full">
              注册
            </Button>
            <p className="text-sm text-muted-foreground">
              已有账号？{" "}
              <Link href="/login" className="text-primary underline underline-offset-4">
                登录
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
