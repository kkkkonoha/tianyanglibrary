"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { AutoResizeTextarea } from "@/components/ui/auto-resize-textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/toast"

export function ImportComicButton({
  mangaId,
  sourceId,
}: {
  mangaId: string
  sourceId: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [pending, startTransition] = useTransition()
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [author, setAuthor] = useState("")
  const [tags, setTags] = useState("")

  function importResource(manualDescription?: string, manualAuthor?: string, manualTags?: string) {
    startTransition(async () => {
      const { importComicResource } = await import("@/lib/actions/comic")
      const result = await importComicResource(mangaId, sourceId, manualDescription, manualAuthor, manualTags)
      if (result?.requiresDescription || result?.requiresMetadata) {
        setDescriptionOpen(true)
        return
      }
      if (result?.error) {
        toast(result.error, "error")
        return
      }
      toast("入库成功", "success")
      router.refresh()
    })
  }

  return (
    <>
      <Button disabled={pending} onClick={() => importResource()}>
        {pending ? "入库中…" : "入库"}
      </Button>
      <Dialog open={descriptionOpen} onOpenChange={setDescriptionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>补充漫画简介</DialogTitle>
            <DialogDescription>
              漫画源没有提供简介，请尽量寻找并填写官方介绍，或记录客观的资源信息后再入库。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="comic-author">作者 *</Label>
            <Input id="comic-author" value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="漫画源未提供时请补充作者" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comic-tags">标签 *</Label>
            <Input id="comic-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="多个标签用逗号分隔" />
          </div>
          <AutoResizeTextarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="请填写官方介绍或客观的资源信息"
            minRows={4}
            maxLength={2000}
            maxHeight={280}
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDescriptionOpen(false)} disabled={pending}>
              取消
            </Button>
            <Button
              type="button"
              disabled={pending || !description.trim()}
              onClick={() => {
                setDescriptionOpen(false)
                importResource(description, author, tags)
              }}
            >
              {pending ? "入库中…" : "确认入库"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
