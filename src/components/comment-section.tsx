"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ConfirmButton } from "@/components/confirm-button"

interface CommentUser {
  id: string
  username: string
  avatar: string | null
}

interface CommentData {
  id: string
  content: string
  createdAt: Date | string
  user: CommentUser
  parentId: string | null
  parent?: { user: { id: string; username: string } } | null
  replies?: CommentData[]
}

function ReplyForm({
  resourceId,
  collectionId,
  parentId,
  onSuccess,
}: {
  resourceId?: string | number
  collectionId?: string
  parentId: string
  onSuccess: () => void
}) {
  return (
    <form
      action={async (formData: FormData) => {
        const { addComment } = await import("@/lib/actions/comment")
        formData.set("parentId", parentId)
        if (resourceId) formData.set("resourceId", String(resourceId))
        if (collectionId) formData.set("collectionId", collectionId)
        const result = await addComment(formData)
        if (result?.success) onSuccess()
      }}
      className="mt-2 flex gap-2"
    >
      <input type="text" name="content" placeholder="写下回复..." required className="flex-1 rounded-md border px-3 py-1.5 text-sm" autoComplete="off" />
      <Button type="submit" size="sm" variant="outline">回复</Button>
    </form>
  )
}

function CommentItem({
  comment,
  depth,
  resourceId,
  collectionId,
  currentUserId,
}: {
  comment: CommentData
  depth: number
  resourceId?: string | number
  collectionId?: string
  currentUserId?: string
}) {
  const [showReply, setShowReply] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content)
  const [refreshKey, setRefreshKey] = useState(0)
  const isOwn = currentUserId === comment.user.id

  return (
    <div className="group">
      <div className="flex gap-2.5 rounded-lg p-3 transition-colors hover:bg-muted/30">
        <Link href={`/profile/${comment.user.username}`}>
          <Avatar className={`${depth === 0 ? "h-7 w-7" : "h-6 w-6"} shrink-0`}>
            <AvatarImage src={comment.user.avatar ?? undefined} />
            <AvatarFallback className="text-xs">{comment.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <Link href={`/profile/${comment.user.username}`} className="text-sm font-medium hover:underline shrink-0">
              {comment.user.username}
            </Link>
            {comment.parentId && comment.parent && (
              <span className="text-xs text-muted-foreground truncate">
                回复 <span className="text-primary">{comment.parent.user.username}</span>
              </span>
            )}
            <span className="text-xs text-muted-foreground/60 shrink-0">
              {new Date(comment.createdAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
            </span>
          </div>
          <p className="mt-0.5 text-sm leading-relaxed">{comment.content}</p>
          <div className="mt-1 flex items-center gap-2">
            {currentUserId && (
              <button
                onClick={() => setShowReply(!showReply)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {showReply ? "取消回复" : "回复"}
              </button>
            )}
            {isOwn && !editing && (
              <>
                <button
                  onClick={() => { setEditing(true); setEditText(comment.content) }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  编辑
                </button>
                <ConfirmButton
                  title="删除评论"
                  description="确定要删除这条评论吗？"
                  confirmText="删除"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive font-normal"
                  onConfirm={async () => {
                    const { deleteComment } = await import("@/lib/actions/comment")
                    await deleteComment(comment.id)
                    setRefreshKey(k => k + 1)
                  }}
                >
                  删除
                </ConfirmButton>
              </>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <div className="ml-7">
          <form
            action={async (formData: FormData) => {
              const { updateComment } = await import("@/lib/actions/comment")
              formData.set("commentId", comment.id)
              await updateComment(formData)
              setEditing(false)
              setRefreshKey(k => k + 1)
            }}
            className="mt-2 flex gap-2"
          >
            <input type="text" name="content" defaultValue={editText} required className="flex-1 rounded-md border px-3 py-1.5 text-sm" />
            <Button type="submit" size="sm" variant="outline">保存</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>取消</Button>
          </form>
        </div>
      )}

      {showReply && (
        <div className={`${depth === 0 ? "ml-10" : "ml-8"}`}>
          <ReplyForm
            resourceId={resourceId}
            collectionId={collectionId}
            parentId={comment.id}
            onSuccess={() => {
              setShowReply(false)
              setRefreshKey(k => k + 1)
            }}
          />
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-7 border-l-2 border-muted pl-4 space-y-1 mt-1">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              resourceId={resourceId}
              collectionId={collectionId}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CommentSection({
  resourceId,
  collectionId,
  comments: rawComments,
  currentUserId,
}: {
  resourceId?: string | number
  collectionId?: string
  comments: CommentData[]
  currentUserId?: string
}) {
  const [refreshKey, setRefreshKey] = useState(0)

  const nestedComments = buildNestedComments(rawComments)

  return (
    <div className="space-y-3">
      <form
        action={async (formData: FormData) => {
          const { addComment } = await import("@/lib/actions/comment")
          if (resourceId) formData.set("resourceId", String(resourceId))
          if (collectionId) formData.set("collectionId", collectionId)
          const result = await addComment(formData)
          if (result?.success) setRefreshKey(k => k + 1)
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          name="content"
          placeholder="写下你的评论..."
          required
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          autoComplete="off"
        />
        <Button type="submit" size="sm">发送</Button>
      </form>

      <div key={refreshKey} className="space-y-1">
        {nestedComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            depth={0}
            resourceId={resourceId}
            collectionId={collectionId}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  )
}

function buildNestedComments(comments: CommentData[]): CommentData[] {
  const map = new Map<string, CommentData>()
  const roots: CommentData[] = []

  for (const c of comments) {
    const comment = { ...c, replies: [] as CommentData[] }
    map.set(comment.id, comment)
  }

  for (const c of map.values()) {
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies!.push(c)
    } else {
      roots.push(c)
    }
  }

  return roots
}
