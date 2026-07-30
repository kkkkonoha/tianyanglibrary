"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createResource, uploadCover } from "@/lib/actions/resource"
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

export function UploadForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resourceId, setResourceId] = useState<string | null>(null)
  const [type, setType] = useState("OTHER")
  const [tags, setTags] = useState("")
  const [tagList, setTagList] = useState<string[]>([])
  const coverRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    formData.set("tags", tagList.join(","))

    const result = await createResource(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else if (result.success && result.id) {
      setResourceId(result.id)
      setLoading(false)
    }
  }

  async function handleCoverUpload() {
    if (!resourceId || !coverRef.current?.files?.[0]) return

    const formData = new FormData()
    formData.set("resourceId", resourceId)
    formData.set("cover", coverRef.current.files[0])

    await uploadCover(formData)
    router.push(`/resource/${resourceId}`)
  }

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && tags.trim()) {
      e.preventDefault()
      const newTag = tags.trim()
      if (!tagList.includes(newTag)) {
        setTagList([...tagList, newTag])
      }
      setTags("")
    }
  }

  function removeTag(tag: string) {
    setTagList(tagList.filter((t) => t !== tag))
  }

  if (resourceId) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <Card>
          <CardHeader>
            <CardTitle>资源创建成功！</CardTitle>
            <CardDescription>是否上传封面图片？</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input ref={coverRef} type="file" accept="image/*" />
            <div className="flex gap-3">
              <Button onClick={handleCoverUpload} variant="default" className="flex-1">
                上传封面
              </Button>
              <Button
                onClick={() => router.push(`/resource/${resourceId}`)}
                variant="outline"
                className="flex-1"
              >
                跳过
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>上传资源</CardTitle>
          <CardDescription>分享资源到公共图书馆</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">标题 *</Label>
              <Input id="title" name="title" placeholder="资源的名称" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="简单介绍一下这个资源..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>资源类型 *</Label>
              <div className="flex flex-wrap gap-2">
                {resourceTypes.map((rt) => (
                  <Button
                    key={rt.value}
                    type="button"
                    variant={type === rt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setType(rt.value)}
                  >
                    {rt.label}
                  </Button>
                ))}
              </div>
              <input type="hidden" name="type" value={type} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">标签</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                onKeyDown={addTag}
                placeholder="输入标签后按回车添加"
              />
              {tagList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {tagList.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag} ✕
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "创建中..." : "创建资源"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
