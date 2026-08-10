import { readdir } from "fs/promises"
import { join } from "path"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NativeRedirect } from "@/components/native-redirect"

export const dynamic = "force-dynamic"

// 解析 APK 文件名中的版本号（tylibrary-v1.0.apk）
function parseVersion(name: string): string | null {
  const m = /v?(\d+\.\d+(?:\.\d+)?)/.exec(name)
  return m ? m[1] : null
}

export default async function AppDownloadPage() {
  let latest: { name: string; version: string | null } | null = null
  try {
    const files = await readdir(join(process.cwd(), "public", "downloads"))
    const apks = files
      .filter((f) => f.endsWith(".apk"))
      .map((name) => ({ name, version: parseVersion(name) }))
      .sort((a, b) => {
        const va = a.version ? a.version.split(".").map(Number) : [0]
        const vb = b.version ? b.version.split(".").map(Number) : [0]
        for (let i = 0; i < Math.max(va.length, vb.length); i++) {
          const d = (vb[i] ?? 0) - (va[i] ?? 0)
          if (d !== 0) return d
        }
        return 0
      })
    latest = apks[0] ?? null
  } catch {
    latest = null
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-12 animate-lib-rise-in">
      <NativeRedirect />
      <h1 className="text-3xl font-bold tracking-tight">手机 App</h1>
      <p className="mt-1.5 text-muted-foreground">天央图书馆安卓客户端</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">📱 安卓版下载</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {latest ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{latest.version ? `v${latest.version}` : "最新版"}</Badge>
                <span>大小 {""}</span>
              </div>
              <a
                href="/api/download-apk"
                download
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                下载安装包
              </a>
              <p className="text-xs text-muted-foreground/80">
                安卓手机下载后点击安装。若提示「未知来源」，请在系统设置中允许安装。已安装过旧版会直接覆盖更新。
              </p>
            </>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">安装包暂未上传，请稍后再来</p>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
        <p className="font-medium">提示</p>
        <p className="mt-1">
          App 与网页版数据完全同步（登录、书架、阅读进度）。网页端同样可以在手机上正常使用。
        </p>
      </div>
    </div>
  )
}
