"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { setCollectionResourceNote } from "@/lib/actions/collection"

export function CollectionResourceNote({ crId, note, isOwner }: { crId: string; note: string | null; isOwner: boolean }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(note ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const formData = new FormData()
    formData.set("crId", crId)
    formData.set("note", value)
    await setCollectionResourceNote(formData)
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  if (!isOwner && !note) return null

  if (!editing) {
    return (
      <div className="mt-1 flex items-center gap-2">
        {isOwner && (
          <button onClick={() => { setValue(note ?? ""); setEditing(true) }} className="text-xs text-muted-foreground hover:text-foreground">
            {note ? "编辑备注" : "添加备注"}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-1.5">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="为这个资源写一段介绍..."
        rows={2}
        className="w-full rounded-md border px-3 py-1.5 text-sm resize-none"
      />
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存备注"}</Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>取消</Button>
      </div>
    </div>
  )
}
