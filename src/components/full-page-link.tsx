import type { ComponentProps } from "react"

type FullPageLinkProps = Omit<ComponentProps<"a">, "href"> & {
  href: string
}

// 站点部署后，仍开着旧页面的浏览器可能保留上一版 App Router 状态，
// 导致软导航请求失效。关键入口使用原生链接，交给浏览器完整加载目标页。
export function FullPageLink({ href, ...props }: FullPageLinkProps) {
  return <a href={href} {...props} />
}
