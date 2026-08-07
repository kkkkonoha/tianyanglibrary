// 路由切换时页面淡入（template 在每次导航重新挂载）
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-lib-fade-in">{children}</div>
}
