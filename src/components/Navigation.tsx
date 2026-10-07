import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Home, BookOpen, Plus, PenLine, NotebookPen, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import { useSwapRequests } from "@/hooks/use-swap-requests"

const Navigation = () => {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const { profile } = useProfile()
  const { pendingCount } = useSwapRequests(isAuthenticated ? profile?.id : undefined)
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  )

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    try { localStorage.setItem("hb_theme", next ? "dark" : "light") } catch {}
  }

  // 四格常駐：未登入點「紀錄／書架」會由頁面自己引導登入
  const navItems = [
    { path: "/browse", icon: Home, label: "瀏覽" },
    { path: "/reviews", icon: PenLine, label: "心得" },
    { path: "/my/records", icon: NotebookPen, label: "紀錄" },
    { path: "/my", icon: BookOpen, label: "書架" },
  ]

  // Netflix App 式底部分頁：深色半透明懸浮膠囊 dock，不貼死底邊、不卡內容
  return (
    <nav className="fixed bottom-3 inset-x-0 z-50 pointer-events-none">
      <div className="pointer-events-auto mx-auto w-fit max-w-[94vw] flex items-center gap-1 bg-neutral-950/85 backdrop-blur-lg border border-neutral-800 rounded-full px-2 py-1.5 shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path ||
            (item.path === '/my' && location.pathname.startsWith('/swaps')) ||
            (item.path === '/reviews' && location.pathname.startsWith('/reviews')) ||
            (item.path === '/my/records' && location.pathname.startsWith('/my/records'))
          const showBadge = item.path === '/my' && pendingCount > 0
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-4 sm:px-5 py-1.5 rounded-full transition-colors min-w-[56px]",
                isActive
                  ? "text-white bg-white/15"
                  : "text-neutral-400 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium whitespace-nowrap">{item.label}</span>
              {showBadge && (
                <span className="absolute -top-0.5 right-1 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {pendingCount}
                </span>
              )}
            </Link>
          )
        })}
        <div className="w-px h-7 bg-neutral-800 mx-0.5" />
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-full text-neutral-400 hover:text-white transition-colors"
          aria-label="切換深淺色"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span className="text-[11px] font-medium whitespace-nowrap">{dark ? "淺色" : "深色"}</span>
        </button>
      </div>
    </nav>
  )
}

export default Navigation
