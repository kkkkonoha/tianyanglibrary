"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createCollection } from "@/lib/actions/collection"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function NewCollectionForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const result = await createCollection(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else if (result.success && result.id) {
      router.push(`/collections/${result.id}`)
    }
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>创建书单</CardTitle>
          <CardDescription>整理你喜欢的资源，分享给其他人</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">书单名称 *</Label>
              <Input id="title" name="title" placeholder="给书单取个名字" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="描述一下这个书单..."
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "创建中..." : "创建书单"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
