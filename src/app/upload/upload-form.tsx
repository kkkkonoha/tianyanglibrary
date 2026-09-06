"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createResource } from "@/lib/actions/resource"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ResourceTypeIcon } from "@/components/resource-type"
import { X } from "lucide-react"

const resourceTypes = [
  { value: "BOOK", label: "电子书" },
  { value: "COMIC", label: "漫画" },
]

export function UploadForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState("BOOK")
  const [tags, setTags] = useState("")
  const [tagList, setTagList] = useState<string[]>([])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    // 输入框中未按回车添加的标签自动加入（防止标签丢失）
    const pendingTag = tags.trim()
    const finalTags =
      pendingTag && !tagList.includes(pendingTag) ? [...tagList, pendingTag] : tagList

    const formData = new FormData(e.currentTarget)
    formData.set("tags", finalTags.join(","))

    const result = await createResource(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else if (result.success && result.id) {
      router.push(`/resource/${result.id}`)
    }
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

  return (
    <div className="container mx-auto max-w-lg px-4 py-8 animate-lib-rise-in">
      <Card>
        <CardHeader>
          <CardTitle>上传资源</CardTitle>
          <CardDescription>分享资源到公共图书馆，创建后可到编辑页添加封面和文件</CardDescription>
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
              <Label htmlFor="author">作者</Label>
              <Input id="author" name="author" placeholder="作者名" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">简介 *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="请尽量寻找并填写官方介绍，帮助读者了解资源内容"
                rows={3}
                required
              />
              <p className="text-xs text-muted-foreground">优先使用出版社、作者、官方页面或漫画源提供的介绍。</p>
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
                    <ResourceTypeIcon type={rt.value} className="h-4 w-4" />
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
                      {tag}<X className="h-3 w-3" aria-hidden="true" />
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
