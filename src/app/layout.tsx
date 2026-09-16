import type { Metadata, Viewport } from "next"
import { cookies } from "next/headers"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/navbar"
import { MobileNav } from "@/components/mobile-nav"
import { ReaderAwareLayout } from "@/components/reader-aware-layout"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "天央图书馆",
  description: "天央图书馆，共享资源、发现好物",
}

// Android 壳使用透明状态栏和 edge-to-edge，网页会读取原生壳注入的系统安全区变量，
// 普通浏览器则由 globals.css 中的 env() 作为回退。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const themeCookie = (await cookies()).get("theme")?.value

  return (
    <html lang="zh-CN" className={themeCookie === "dark" ? "dark" : undefined} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(()=>{let l=null,c=null;try{const v=localStorage.getItem('theme');if(v==='dark'||v==='light')l=v}catch{}try{const v=document.cookie.split('; ').find(v=>v.startsWith('theme='))?.slice(6);if(v==='dark'||v==='light')c=v}catch{}const t=l??c;if(t==='dark'||(t===null&&typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');if(t!==null){try{localStorage.setItem('theme',t)}catch{}try{document.cookie='theme='+t+'; Max-Age=31536000; Path=/; SameSite=Lax'}catch{}}})()` }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <Providers>
          <ReaderAwareLayout navbar={<Navbar />} mobilenav={<MobileNav />}>
            {children}
          </ReaderAwareLayout>
        </Providers>
      </body>
    </html>
  )
}
