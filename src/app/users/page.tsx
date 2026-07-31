import { prisma } from "@/lib/db"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const roleLabels: Record<string, string> = {
  super_admin: "超级管理员",
  admin: "管理员",
  user: "普通用户",
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams

  const where: any = {}
  if (q) {
    where.OR = [
      { username: { contains: q } },
      { bio: { contains: q } },
    ]
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      username: true,
      avatar: true,
      bio: true,
      role: true,
      createdAt: true,
      _count: { select: { resources: true, collections: true } },
    },
  })

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">用户</h1>
        <p className="mt-1.5 text-muted-foreground">查看所有成员</p>
      </div>

      <form className="mb-6 flex gap-2">
        <Input name="q" placeholder="搜索用户名或简介..." defaultValue={q ?? ""} className="bg-background" />
        <Button type="submit">搜索</Button>
      </form>

      {users.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            没有找到用户
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <Link key={user.id} href={`/profile/${user.username}`}>
              <Card className="transition-colors hover:bg-muted/30">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar ?? undefined} />
                    <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{user.username}</span>
                      {user.role !== "user" && (
                        <Badge variant="secondary" className="text-xs">{roleLabels[user.role] ?? user.role}</Badge>
                      )}
                    </div>
                    {user.bio && <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{user.bio}</p>}
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                      <span>{user._count.resources} 资源</span>
                      <span>{user._count.collections} 目录</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
