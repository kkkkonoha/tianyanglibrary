import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UploadForm } from "./upload-form"

export default async function UploadPage() {
  const session = await auth()
  if (!session?.user) redirect("/login?callback=/upload")

  return <UploadForm />
}
