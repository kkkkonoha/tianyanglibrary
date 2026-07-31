"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { updateResource } from "@/lib/actions/resource"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react"

const resourceTypes = [
  { value: "BOOK", label: "📖 电子书" },
  { value: "COMIC", label: "📘 漫画" },
]

type FileStatus = "done" | "queued" | "uploading" | "failed"

interface FileItem {
  id: string | null
  fileName: string
  fileSize: number
  status: FileStatus
  progress: number
  file?: File
}

interface Props {
  id: string
  title: string
  description: string
  type: string
  coverImage: string | null
  tags: string[]
  existingFiles: Array<{ id: string; fileName: string; fileSize: number }>
}

export function EditResourceForm({ id, title, description, type, coverImage, tags, existingFiles }: Props) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [currentType, setCurrentType] = useState(type)
  const [currentTags, setCurrentTags] = useState<string[]>(tags)
  const [tagInput, setTagInput] = useState("")
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverMessage, setCoverMessage] = useState("")
  const [files, setFiles] = useState<FileItem[]>(
    existingFiles.map((f) => ({ ...f, status: "done", progress: 100 }))
  )
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [reorderSaving, setReorderSaving] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const queueRef = useRef<Array<{ file: File; index: number }>>([])
  const busyRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
    if (coverPreview) URL.revokeObjectURL(coverPreview)
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setCoverFile(f)
    if (f) {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
      setCoverPreview(URL.createObjectURL(f))
    } else {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
      setCoverPreview(null)
    }
  }

  function uploadOne(file: File, onProgress: (p: number) => void) {
    return new Promise<{ success: boolean; file?: { id: string; fileName: string; fileSize: number; order: number }; error?: string }>((resolve) => {
      const formData = new FormData()
      formData.set("resourceId", id)
      formData.set("file", file)
      const xhr = new XMLHttpRequest()
      xhr.open("POST", "/api/upload/file")
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            resolve(JSON.parse(xhr.responseText))
          } catch {
            resolve({ success: false, error: "响应解析失败" })
          }
        } else {
          try {
            resolve({ success: false, error: JSON.parse(xhr.responseText).error ?? "上传失败" })
          } catch {
            resolve({ success: false, error: `上传失败（${xhr.status}）` })
          }
        }
      }
      xhr.onerror = () => resolve({ success: false, error: "网络错误" })
      xhr.send(formData)
    })
  }

  function updateItem(index: number, patch: Partial<FileItem>) {
    setFiles((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  async function processQueue() {
    if (busyRef.current) return
    busyRef.current = true
    setUploading(true)
    while (queueRef.current.length > 0) {
      const { file, index } = queueRef.current.shift()!
      updateItem(index, { status: "uploading", progress: 0 })
      const result = await uploadOne(file, (p) => updateItem(index, { progress: p }))
      if (result.success && result.file) {
        updateItem(index, { id: result.file.id, status: "done", progress: 100 })
      } else {
        updateItem(index, { status: "failed" })
      }
    }
    busyRef.current = false
    setUploading(false)
  }

  function enqueueFiles(fileList: File[]) {
    const startIndex = files.length
    const newItems: FileItem[] = fileList.map((f) => ({
      id: null,
      fileName: f.name,
      fileSize: f.size,
      status: "queued",
      progress: 0,
      file: f,
    }))
    setFiles((prev) => [...prev, ...newItems])
    fileList.forEach((f, i) => queueRef.current.push({ file: f, index: startIndex + i }))
    void processQueue()
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return
    enqueueFiles(selected)
    e.target.value = ""
  }

  function retryFile(index: number) {
    const item = files[index]
    if (!item?.file) return
    updateItem(index, { status: "queued", progress: 0 })
    queueRef.current.push({ file: item.file, index })
    void processQueue()
  }

  async function handleDeleteFile(fileId: string) {
    setDeletingFileId(fileId)
    const res = await fetch(`/api/upload/file-delete?id=${fileId}`, { method: "DELETE" })
    const data = await res.json()
    if (data.success) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
    }
    setDeletingFileId(null)
  }

  async function saveOrder(next: FileItem[]) {
    const orderedIds = next.filter((it) => it.id).map((it) => it.id!)
    if (orderedIds.length === 0) return
    setReorderSaving(true)
    try {
      const res = await fetch("/api/upload/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: id, orderedIds }),
      })
      const data = await res.json()
      if (!data.success) setError(data.error ?? "顺序保存失败")
    } catch {
      setError("顺序保存失败，请重试")
    } finally {
      setReorderSaving(false)
    }
  }

  function moveItem(from: number, to: number) {
    const next = [...files]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setFiles(next)
    void saveOrder(next)
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

  const mutationsDisabled = uploading || deletingFileId !== null

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
              {(coverPreview || coverImage) && (
                <img src={coverPreview ?? coverImage!} alt="封面预览" className="h-32 w-full rounded-lg border object-contain bg-muted/30" />
              )}
              <input type="file" accept="image/*" onChange={handleCoverChange}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium" />
              {coverMessage && <p className="text-sm text-muted-foreground">{coverMessage}</p>}
            </div>

            <div className="space-y-2">
              <Label>已有文件 ({files.length})</Label>
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无文件</p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    {files.map((f, i) => (
                      <div
                        key={f.id ?? `new-${i}`}
                        draggable={!mutationsDisabled && f.status === "done"}
                        onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = "move" }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => { e.preventDefault(); if (dragIndex !== null && dragIndex !== i) moveItem(dragIndex, i); setDragIndex(null) }}
                        onDragEnd={() => setDragIndex(null)}
                        className={`flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm ${f.status === "done" && !mutationsDisabled ? "cursor-grab" : ""} ${dragIndex === i ? "opacity-50" : ""}`}
                      >
                        <GripVertical className={`h-4 w-4 shrink-0 ${f.status === "done" && !mutationsDisabled ? "text-muted-foreground" : "text-muted-foreground/30"}`} />
                        <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">{i + 1}</span>
                        <span className="flex-1 truncate">{f.fileName}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{(f.fileSize / 1024 / 1024).toFixed(1)} MB</span>

                        {f.status === "uploading" && (
                          <span className="flex w-24 items-center gap-1.5">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                              <span className="block h-full rounded-full bg-primary transition-all" style={{ width: `${f.progress}%` }} />
                            </span>
                            <span className="w-9 text-right text-xs tabular-nums">{f.progress}%</span>
                          </span>
                        )}
                        {f.status === "queued" && <span className="shrink-0 text-xs text-muted-foreground">排队中…</span>}
                        {f.status === "failed" && (
                          <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs text-destructive" onClick={() => retryFile(i)}>上传失败，重试</Button>
                        )}
                        {f.status === "done" && <span className="shrink-0 text-xs text-green-600">✓</span>}

                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground"
                          disabled={mutationsDisabled} onClick={() => moveItem(i, Math.max(0, i - 1))} title="上移">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground"
                          disabled={mutationsDisabled} onClick={() => moveItem(i, Math.min(files.length - 1, i + 1))} title="下移">
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          disabled={mutationsDisabled} onClick={() => f.id && handleDeleteFile(f.id)}>
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                  {reorderSaving && <p className="text-xs text-muted-foreground">正在保存顺序…</p>}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="resourceFile">添加文件（可多选）</Label>
              <input ref={inputRef} id="resourceFile" type="file" multiple onChange={handleFileSelect}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium" />
              <p className="text-xs text-muted-foreground">支持任意格式，单文件最大 500MB；选择后自动逐个上传，上传完成后可拖拽或点上下箭头调整顺序</p>
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
