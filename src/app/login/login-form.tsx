"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { DownloadAppLink } from "@/components/download-app-link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get("registered")
  const callback = searchParams.get("callback")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)

    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    })

    if (result?.error) {
      setError("邮箱或密码错误")
      setLoading(false)
    } else {
      // 整页跳转：客户端导航会导致 SessionProvider 的 session 状态不同步（卡在未登录），
      // 整页加载时 SessionProvider 重新初始化，与手动刷新等效
      window.location.href = callback ?? "/"
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">欢迎回来</CardTitle>
          <CardDescription>登录天央图书馆</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {registered === "true" && (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                注册成功！请等待管理员审核通过后方可登录。
              </div>
            )}
            {registered === "pending" && (
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                注册成功！请等待管理员审核通过后方可登录。
              </div>
            )}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">QQ 号</Label>
              <Input id="email" name="email" type="text" placeholder="你的 QQ 号" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input id="password" name="password" type="password" placeholder="••••••" required />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "登录中..." : "登录"}
            </Button>
            <p className="text-sm text-muted-foreground">
              还没有账号？{" "}
              <Link href="/register" className="text-primary underline underline-offset-4">
                注册
              </Link>
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <Link href="/forgot-password" className="hover:underline">
                忘记密码？
              </Link>
              <Link href="/contact-admin" className="hover:underline">
                联系管理员
              </Link>
            </div>
            <div className="text-center text-xs text-muted-foreground">
              <DownloadAppLink className="hover:underline">📱 下载手机 App</DownloadAppLink>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
