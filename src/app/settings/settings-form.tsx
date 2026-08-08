"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateProfile, changePassword, changeUsername, setSecurityQuestion } from "@/lib/actions/settings"

export function SettingsForm({
  username,
  bio,
  avatar,
  lastUsernameChangeAt,
  securityQuestion,
}: {
  username: string
  bio: string
  avatar: string | null
  lastUsernameChangeAt: Date | null
  securityQuestion: string | null
}) {
  const router = useRouter()
  const [bioValue, setBioValue] = useState(bio)
  const [bioMsg, setBioMsg] = useState("")
  const [pwMsg, setPwMsg] = useState("")
  const [unameMsg, setUnameMsg] = useState("")
  const [sqMsg, setSqMsg] = useState("")
  const [avatarMsg, setAvatarMsg] = useState("")
  const [previewAvatar, setPreviewAvatar] = useState(avatar)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  async function handleSecurityQuestion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSqMsg("")
    const formData = new FormData(e.currentTarget)
    const result = await setSecurityQuestion(formData)
    setSqMsg(result?.error ? result.error : (result?.message ?? "保存成功"))
    if (result?.success) {
      e.currentTarget.reset()
      router.refresh()
    }
  }
  const fileRef = useRef<HTMLInputElement>(null)

  // 用户名每月一次限制的提示
  let usernameLocked = false
  let usernameHint = ""
  if (lastUsernameChangeAt) {
    const elapsed = Date.now() - new Date(lastUsernameChangeAt).getTime()
    const INTERVAL = 30 * 24 * 60 * 60 * 1000
    if (elapsed < INTERVAL) {
      usernameLocked = true
      const remainingDays = Math.ceil((INTERVAL - elapsed) / (24 * 60 * 60 * 1000))
      usernameHint = `上次修改于 ${new Date(lastUsernameChangeAt).toLocaleDateString("zh-CN")}，还需等待 ${remainingDays} 天`
    }
  }

  async function handleUsernameChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUnameMsg("")
    const formData = new FormData(e.currentTarget)
    const result = await changeUsername(formData)
    setUnameMsg(result?.error ? result.error : (result?.message ?? "修改成功"))
    if (result?.success) {
      e.currentTarget.reset()
      router.refresh()
    }
  }

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
    <div className="container mx-auto max-w-lg px-4 py-12 space-y-6 animate-lib-rise-in">
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
          <CardTitle>安全问题</CardTitle>
          <CardDescription>
            {securityQuestion
              ? `当前问题：${securityQuestion}（修改需验证当前密码）`
              : "设置安全问题后，忘记密码可在登录页自助找回"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSecurityQuestion} className="space-y-3">
            <div>
              <Label htmlFor="sqCurrentPassword">当前密码</Label>
              <Input id="sqCurrentPassword" name="currentPassword" type="password" placeholder="用于验证身份" required />
            </div>
            <div>
              <Label htmlFor="securityQuestion">安全问题</Label>
              <select
                id="securityQuestion"
                name="securityQuestion"
                defaultValue={securityQuestion ?? ""}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="" disabled>{securityQuestion ? "请选择或保持原问题" : "请选择安全问题（或自行填写）"}</option>
                <option value="你的小学名称是什么？">你的小学名称是什么？</option>
                <option value="你最喜欢的书叫什么？">你最喜欢的书叫什么？</option>
                <option value="你的母亲的名字是什么？">你的母亲的名字是什么？</option>
                <option value="你的第一只宠物叫什么？">你的第一只宠物叫什么？</option>
                <option value="你的出生城市是哪里？">你的出生城市是哪里？</option>
                <option value="你最难忘的旅行目的地是哪里？">你最难忘的旅行目的地是哪里？</option>
              </select>
              <Input id="securityQuestionCustom" name="securityQuestionCustom" type="text" placeholder="或自定义安全问题" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="securityAnswer">安全答案</Label>
              <Input id="securityAnswer" name="securityAnswer" type="text" placeholder="至少2个字符" required />
            </div>
            <Button type="submit" size="sm">{securityQuestion ? "更新安全问题" : "保存安全问题"}</Button>
            {sqMsg && <p className={`text-sm ${sqMsg.includes("保存") ? "text-green-600" : "text-destructive"}`}>{sqMsg}</p>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>修改用户名</CardTitle>
          <CardDescription>用户名每月只能修改一次，修改后主页链接将更新</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUsernameChange} className="space-y-3">
            <div>
              <Label htmlFor="username">新用户名</Label>
              <Input
                id="username"
                name="username"
                defaultValue={username}
                disabled={usernameLocked}
                placeholder="2-20 个字符，可含字母、数字、下划线、中文"
              />
              {usernameHint && <p className="mt-1 text-xs text-muted-foreground">{usernameHint}</p>}
            </div>
            <Button type="submit" size="sm" disabled={usernameLocked}>保存用户名</Button>
            {unameMsg && <p className={`text-sm ${unameMsg.includes("成功") ? "text-green-600" : "text-destructive"}`}>{unameMsg}</p>}
          </form>
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
