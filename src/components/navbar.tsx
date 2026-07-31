import Link from "next/link"
import { auth, signOut } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/permissions"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export async function Navbar() {
  const session = await auth()

  let avatarUrl = session?.user?.image ?? null
  let unreadCount = 0
  if (session?.user) {
    const [userData, countResult] = await Promise.all([
      prisma.user.findUnique({
        where: { email: session.user.email! },
        select: { avatar: true },
      }),
      prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
        `SELECT COUNT(*) as cnt FROM Notification WHERE userId = ? AND "read" = 0`,
        session.user.id as string
      ),
    ])
    avatarUrl = userData?.avatar ?? null
    unreadCount = countResult[0]?.cnt ?? 0
  }

  return (
    <header className="sticky top-0 z-50 border-b border-primary/10 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            </span>
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent sm:inline hidden">天央图书馆</span>
          </Link>
          <nav className="hidden gap-1 text-sm sm:flex">
            <Link href="/" className="rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-secondary-foreground">
              动态
            </Link>
            <Link href="/explore" className="rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-secondary-foreground">
              探索
            </Link>
            <Link href="/collections" className="rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-secondary-foreground">
              目录
            </Link>
            <Link href="/users" className="rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-secondary-foreground">
              用户
            </Link>
            {isSuperAdmin(session) && (
              <Link href="/admin" className="rounded-md px-3 py-1.5 text-sm font-medium text-orange-600 transition-all hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950">
                管理
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {session?.user ? (
            <>
              <Link href="/upload">
                <Button variant="default" size="sm" className="shadow-none">
                  上传资源
                </Button>
                </Link>

              <Link href="/notifications" className="relative p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-medium text-primary">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center justify-center rounded-full outline-none ring-primary/30 transition-all hover:ring-2 focus-visible:ring-2">
                  <Avatar className="h-8 w-8 ring-2 ring-primary/10 transition-shadow hover:ring-primary/30">
                    <AvatarImage src={avatarUrl ?? undefined} alt={session.user.name ?? ""} />
                    <AvatarFallback>
                      {session.user.name?.slice(0, 2).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{session.user.name}</p>
                      <p className="text-xs text-muted-foreground">{session.user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link href={`/profile/${session.user.name}`} className="w-full">
                      个人主页
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href="/settings" className="w-full">
                      设置
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <form
                    action={async () => {
                      "use server"
                      await signOut({ redirectTo: "/" })
                    }}
                  >
                    <DropdownMenuItem>
                      <button type="submit" className="w-full cursor-pointer">
                        退出登录
                      </button>
                    </DropdownMenuItem>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link href="/login">
              <Button variant="default" size="sm" className="shadow-none">
                登录
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
