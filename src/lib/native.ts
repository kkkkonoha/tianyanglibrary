// 原生 App（Capacitor）环境检测与系统栏适配
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false
  const cap = (window as any).Capacitor
  return !!(cap && typeof cap.isNativePlatform === "function" && cap.isNativePlatform())
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
