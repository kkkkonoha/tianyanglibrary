import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { NewCollectionForm } from "./new-collection-form"

export default async function NewCollectionPage() {
  const session = await auth()
  if (!session?.user) redirect("/login?callback=/collections/new")

  return <NewCollectionForm />
}
