import type { Session } from "next-auth"

export function isAdmin(session: Session | null): boolean {
  if (!session?.user) return false
  const role = (session.user as any).role as string | undefined
  return role === "admin" || role === "super_admin"
}

export function isSuperAdmin(session: Session | null): boolean {
  if (!session?.user) return false
  return (session.user as any).role === "super_admin"
}
