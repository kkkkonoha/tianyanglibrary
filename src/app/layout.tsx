import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { headers } from "next/headers"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Navbar } from "@/components/navbar"
import { MobileNav } from "@/components/mobile-nav"

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const h = await headers()
  const pathname = h.get("x-pathname") ?? ""
  const isReader = /^\/comics\/.+\/read$/.test(pathname)

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{let t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch{}` }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <Providers>
          {!isReader && <Navbar />}
          <main className={isReader ? "min-h-screen" : "min-h-screen pb-14 sm:pb-0"}>{children}</main>
          {!isReader && <MobileNav />}
        </Providers>
      </body>
    </html>
  )
}
