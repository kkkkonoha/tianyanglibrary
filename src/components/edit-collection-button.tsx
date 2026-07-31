"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { updateCollection } from "@/lib/actions/collection"

export function EditCollectionButton({ id, title, description }: { id: string; title: string; description: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [newTitle, setNewTitle] = useState(title)
  const [newDesc, setNewDesc] = useState(description)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    setLoading(true)
    setError("")
    const formData = new FormData()
    formData.set("id", id)
    formData.set("title", newTitle)
    formData.set("description", newDesc)
    const result = await updateCollection(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setOpen(false)
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger onClick={() => { setNewTitle(title); setNewDesc(description); setError("") }}>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">✎</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑目录</DialogTitle>
          <DialogDescription>修改目录名称和简介</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {error && <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</div>}
          <div className="space-y-1.5">
            <Label>名称</Label>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>简介</Label>
            <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? "保存中..." : "保存"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
