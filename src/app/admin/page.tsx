import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isSuperAdmin } from "@/lib/permissions"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SetRoleButton } from "./set-role-button"

export default async function AdminPage() {
  const session = await auth()
  if (!isSuperAdmin(session)) redirect("/")

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { resources: true, activities: true } },
    },
  })

  const roleLabels: Record<string, string> = {
    super_admin: "超级管理员",
    admin: "管理员",
    user: "普通用户",
  }

  const roleVariants: Record<string, "default" | "secondary" | "destructive"> = {
    super_admin: "destructive",
    admin: "default",
    user: "secondary",
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">管理面板</h1>
        <p className="mt-1.5 text-muted-foreground">用户管理与权限控制</p>
      </div>

      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{user.username}</span>
                  <Badge variant={roleVariants[user.role] ?? "secondary"}>
                    {roleLabels[user.role] ?? user.role}
                  </Badge>
                </div>
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  <span>{user.email}</span>
                  <span>{user._count.resources} 资源</span>
                  <span>{user._count.activities} 动态</span>
                </div>
              </div>
              {user.role !== "super_admin" && (
                <div className="flex items-center gap-2">
                  <Link href={`/profile/${user.username}`}>
                    <Button variant="outline" size="sm">查看主页</Button>
                  </Link>
                  <SetRoleButton
                    userId={user.id}
                    role={user.role}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
