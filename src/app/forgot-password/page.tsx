import { Suspense } from "react"
import { ForgotPasswordForm } from "./forgot-password-form"

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center">加载中...</div>}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  )
}
