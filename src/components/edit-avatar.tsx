"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function EditAvatar({
  username,
  currentAvatar,
}: {
  username: string
  currentAvatar: string | null
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [preview, setPreview] = useState<string | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setLoading(true)
    setMessage("")

    const formData = new FormData()
    formData.set("file", file)

    try {
      const res = await fetch("/api/upload/avatar", { method: "POST", body: formData })
      const data = await res.json()
      if (data.success) {
        setMessage("头像更新成功")
        setPreview(data.avatar)
        if (localPreview) URL.revokeObjectURL(localPreview)
        setLocalPreview(null)
        router.refresh()
      } else {
        setMessage(data.error ?? "上传失败")
      }
    } catch {
      setMessage("网络错误")
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      if (localPreview) URL.revokeObjectURL(localPreview)
      setLocalPreview(URL.createObjectURL(f))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">修改头像</CardTitle>
        <CardDescription>上传新的头像图片（最大 5MB）</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={localPreview ?? preview ?? currentAvatar ?? undefined} />
            <AvatarFallback className="text-lg">
              {username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium" />
            <Button onClick={handleUpload} disabled={loading} size="sm">
              {loading ? "上传中..." : "上传头像"}
            </Button>
          </div>
        </div>
        {message && (
          <p className={`text-sm ${message.includes("成功") ? "text-green-600" : "text-destructive"}`}>
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
