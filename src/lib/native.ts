import { registerPlugin } from "@capacitor/core"

interface NativeInsetsPlugin {
  getInsets(): Promise<{
    top: number
    right: number
    bottom: number
    left: number
  }>
}

const NativeInsets = registerPlugin<NativeInsetsPlugin>("NativeInsets")

// 原生 App（Capacitor）环境检测与系统栏适配
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false
  const cap = (window as any).Capacitor
  return !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform())
}

// 从原生窗口读取系统栏/刘海尺寸。Android/Harmony WebView 对 CSS env() 的支持不一致，
// 因此网页端使用原生结果覆盖 CSS 变量，普通浏览器仍保留 env() 回退。
export async function syncNativeSafeArea() {
  if (!isNativeApp()) return

  try {
    const insets = await NativeInsets.getInsets()
    const root = document.documentElement
    root.style.setProperty("--app-safe-top", `${insets.top}px`)
    root.style.setProperty("--app-safe-right", `${insets.right}px`)
    root.style.setProperty("--app-safe-bottom", `${insets.bottom}px`)
    root.style.setProperty("--app-safe-left", `${insets.left}px`)
  } catch {
    // 旧版壳未内置 NativeInsets 时继续使用 CSS env() 回退。
  }
}

// 切换系统状态栏/导航栏图标颜色（App 内）：深色页面用 LIGHT（浅色图标），浅色页面用 DARK
export async function setStatusBarStyle(style: "LIGHT" | "DARK") {
  if (!isNativeApp()) return
  try {
    const { StatusBar } = await import("@capacitor/status-bar")
    await StatusBar.setStyle({ style: style as any })
  } catch {
    // 非 App 环境或插件不可用时静默
  }
}
