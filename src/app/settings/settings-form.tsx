"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateProfile, changePassword } from "@/lib/actions/settings"

export function SettingsForm({ username, bio, avatar }: { username: string; bio: string; avatar: string | null }) {
  const router = useRouter()
  const [bioValue, setBioValue] = useState(bio)
  const [bioMsg, setBioMsg] = useState("")
  const [pwMsg, setPwMsg] = useState("")
  const [avatarMsg, setAvatarMsg] = useState("")
  const [previewAvatar, setPreviewAvatar] = useState(avatar)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleBioSave() {
    setBioMsg("")
    const formData = new FormData()
    formData.set("bio", bioValue)
    const result = await updateProfile(formData)
    setBioMsg(result?.error ? result.error : "保存成功")
  }

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPwMsg("")
    const formData = new FormData(e.currentTarget)
    const result = await changePassword(formData)
    setPwMsg(result?.error ? result.error : (result?.message ?? "修改成功"))
    if (result?.success) e.currentTarget.reset()
  }

  async function handleAvatarUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setAvatarMsg("")
    const formData = new FormData()
    formData.set("file", file)
    const res = await fetch("/api/upload/avatar", { method: "POST", body: formData })
    const data = await res.json()
    if (data.success) {
      setPreviewAvatar(data.avatar)
      setAvatarMsg("上传成功")
      if (localPreview) URL.revokeObjectURL(localPreview)
      setLocalPreview(null)
    } else {
      setAvatarMsg(data.error ?? "上传失败")
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
    <div className="container mx-auto max-w-lg px-4 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">个人设置</h1>
        <p className="mt-1.5 text-muted-foreground">{username}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>头像</CardTitle>
          <CardDescription>更换头像（最大 5MB）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(localPreview || previewAvatar) && (
            <img src={localPreview ?? previewAvatar!} alt="头像预览" className="h-20 w-20 rounded-full object-cover border" />
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium" />
          <div className="flex gap-2">
            <Button onClick={handleAvatarUpload} size="sm">上传</Button>
          </div>
          {avatarMsg && <p className="text-sm text-muted-foreground">{avatarMsg}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>简介</CardTitle>
          <CardDescription>个人简介会显示在你的主页上</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={bioValue}
            onChange={(e) => setBioValue(e.target.value)}
            rows={3}
            placeholder="介绍一下自己..."
          />
          <div className="flex gap-2">
            <Button onClick={handleBioSave} size="sm">保存</Button>
          </div>
          {bioMsg && <p className={`text-sm ${bioMsg === "保存成功" ? "text-green-600" : "text-destructive"}`}>{bioMsg}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
          <CardDescription>修改登录密码</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <Label htmlFor="currentPassword">当前密码</Label>
              <Input id="currentPassword" name="currentPassword" type="password" required />
            </div>
            <div>
              <Label htmlFor="newPassword">新密码</Label>
              <Input id="newPassword" name="newPassword" type="password" required placeholder="至少6个字符" />
            </div>
            <div>
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required />
            </div>
            <Button type="submit" size="sm">修改密码</Button>
            {pwMsg && <p className={`text-sm ${pwMsg.includes("成功") ? "text-green-600" : "text-destructive"}`}>{pwMsg}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
