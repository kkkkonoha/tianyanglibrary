import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id as string },
    select: { bio: true, avatar: true, username: true },
  })

  return <SettingsForm username={user?.username ?? ""} bio={user?.bio ?? ""} avatar={user?.avatar ?? null} />
}
