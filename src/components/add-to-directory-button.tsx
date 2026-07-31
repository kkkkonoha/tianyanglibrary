"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { addToCollection } from "@/lib/actions/collection"

interface DirItem {
  id: string
  title: string
}

export function AddToDirectoryButton({
  resourceId,
  directories,
}: {
  resourceId: string
  directories: DirItem[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [added, setAdded] = useState<string[]>([])

  async function handleAdd(dirId: string) {
    setLoading(dirId)
    const result = await addToCollection(dirId, resourceId)
    if (result?.success) {
      setAdded([...added, dirId])
    }
    setLoading(null)
  }

  const available = directories.filter((d) => !added.includes(d.id))

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setOpen(!open)}
      >
        加入目录
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-56 rounded-lg border bg-popover p-1 shadow-md">
            {available.length === 0 ? (
              <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                {directories.length === 0 ? "还没有创建目录" : "已添加到所有目录"}
              </p>
            ) : (
              available.map((dir) => (
                <button
                  key={dir.id}
                  onClick={() => handleAdd(dir.id)}
                  disabled={loading === dir.id}
                  className="flex w-full items-center rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  {loading === dir.id ? "添加中..." : dir.title}
                </button>
              ))
            )}
            {directories.length === 0 && (
              <a
                href="/collections/new"
                className="flex w-full items-center rounded-md px-2 py-2 text-sm text-primary hover:bg-accent"
              >
                创建新目录
              </a>
            )}
          </div>
        </>
      )}
    </div>
  )
}
