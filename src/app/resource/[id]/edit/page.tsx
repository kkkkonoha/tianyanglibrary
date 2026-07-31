import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"
import { redirect, notFound } from "next/navigation"
import { EditResourceForm } from "./edit-form"

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")

  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      files: { orderBy: { createdAt: "asc" } },
    },
  })

  if (!resource) notFound()
  if (!isAdmin(session) && resource.uploaderId !== (session.user as { id: string }).id) {
    redirect(`/resource/${id}`)
  }

  return (
    <EditResourceForm
      id={resource.id}
      title={resource.title}
      description={resource.description ?? ""}
      type={resource.type}
      tags={resource.tags.map((rt) => rt.tag.name)}
      existingFiles={resource.files.map((f) => ({ id: f.id, fileName: f.fileName, fileSize: f.fileSize }))}
    />
  )
}
