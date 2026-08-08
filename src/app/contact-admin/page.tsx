import { Suspense } from "react"
import { ContactAdminForm } from "./contact-admin-form"

export default function ContactAdminPage() {
  return (
    <div className="flex min-h-screen animate-lib-rise-in items-center justify-center px-4">
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center">加载中...</div>}>
        <ContactAdminForm />
      </Suspense>
    </div>
  )
}
