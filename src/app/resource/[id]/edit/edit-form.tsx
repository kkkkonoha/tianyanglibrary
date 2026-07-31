"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateResource } from "@/lib/actions/resource"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const resourceTypes = [
  { value: "BOOK", label: "📖 电子书" },
  { value: "COMIC", label: "📘 漫画" },
  { value: "VIDEO", label: "🎬 视频" },
  { value: "OTHER", label: "📁 其他" },
]

interface Props {
  id: string
  title: string
  description: string
  type: string
  tags: string[]
  existingFiles: Array<{ id: string; fileName: string; fileSize: number }>
}

export function EditResourceForm({ id, title, description, type, tags, existingFiles }: Props) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [currentType, setCurrentType] = useState(type)
  const [currentTags, setCurrentTags] = useState<string[]>(tags)
  const [tagInput, setTagInput] = useState("")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverMessage, setCoverMessage] = useState("")
  const [fileMessage, setFileMessage] = useState("")
  const [files, setFiles] = useState(existingFiles)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    formData.set("id", id)
    formData.set("type", currentType)
    formData.set("tags", currentTags.join(","))

    const result = await updateResource(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      if (coverFile) await handleCoverUpload()
      router.push(`/resource/${id}`)
    }
  }

  async function handleCoverUpload() {
    if (!coverFile) return
    const formData = new FormData()
    formData.set("resourceId", id)
    formData.set("file", coverFile)
    const res = await fetch("/api/upload/cover", { method: "POST", body: formData })
    const data = await res.json()
    if (!data.success) setCoverMessage(data.error ?? "上传失败")
  }

  async function handleFileUpload() {
    const input = document.querySelector<HTMLInputElement>("#resourceFile")
    const file = input?.files?.[0]
    if (!file) return
    setLoading(true)
    setFileMessage("")
    const formData = new FormData()
    formData.set("resourceId", id)
    formData.set("file", file)
    const res = await fetch("/api/upload/file", { method: "POST", body: formData })
    const data = await res.json()
    if (data.success) {
      setFiles([...files, { id: data.file.id, fileName: data.file.fileName, fileSize: data.file.fileSize }])
      input.value = ""
    } else {
      setFileMessage(data.error ?? "上传失败")
    }
    setLoading(false)
  }

  async function handleDeleteFile(fileId: string) {
    setDeletingFileId(fileId)
    const res = await fetch(`/api/upload/file-delete?id=${fileId}`, { method: "DELETE" })
    const data = await res.json()
    if (data.success) {
      setFiles(files.filter((f) => f.id !== fileId))
    }
    setDeletingFileId(null)
  }

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault()
      const newTag = tagInput.trim()
      if (!currentTags.includes(newTag)) setCurrentTags([...currentTags, newTag])
      setTagInput("")
    }
  }

  function removeTag(tag: string) {
    setCurrentTags(currentTags.filter((t) => t !== tag))
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>编辑资源</CardTitle>
          <CardDescription>修改资源信息</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

            <div className="space-y-2">
              <Label htmlFor="title">标题 *</Label>
              <Input id="title" name="title" defaultValue={title} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea id="description" name="description" defaultValue={description} rows={3} />
            </div>

            <div className="space-y-2">
              <Label>资源类型 *</Label>
              <div className="flex flex-wrap gap-2">
                {resourceTypes.map((rt) => (
                  <Button key={rt.value} type="button" variant={currentType === rt.value ? "default" : "outline"} size="sm" onClick={() => setCurrentType(rt.value)}>
                    {rt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>标签</Label>
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="输入标签后按回车添加" />
              {currentTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {currentTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>{tag} ✕</Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>封面</Label>
              <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium" />
              {coverMessage && <p className="text-sm text-muted-foreground">{coverMessage}</p>}
            </div>

            <div className="space-y-2">
              <Label>已有文件 ({files.length})</Label>
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无文件</p>
              ) : (
                <div className="space-y-1.5">
                  {files.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                      <span className="flex-1 truncate">{f.fileName}</span>
                      <span className="text-xs text-muted-foreground">{(f.fileSize / 1024 / 1024).toFixed(1)} MB</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteFile(f.id)} disabled={deletingFileId === f.id}>
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="resourceFile">添加文件</Label>
              <input id="resourceFile" type="file"
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium" />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleFileUpload} disabled={loading}>上传</Button>
              </div>
              <p className="text-xs text-muted-foreground">支持任意格式，最大 500MB</p>
              {fileMessage && <p className={`text-sm ${fileMessage.includes("成功") ? "text-green-600" : "text-destructive"}`}>{fileMessage}</p>}
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1" disabled={loading}>{loading ? "保存中..." : "保存修改"}</Button>
              <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>取消</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
