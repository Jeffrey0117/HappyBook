import { Link, useLocation } from "react-router-dom"
import { Home, BookOpen, Plus, PenLine, NotebookPen } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import { useSwapRequests } from "@/hooks/use-swap-requests"

const Navigation = () => {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const { profile } = useProfile()
  const { pendingCount } = useSwapRequests(isAuthenticated ? profile?.id : undefined)

  // 四格常駐：未登入點「紀錄／書架」會由頁面自己引導登入
  const navItems = [
    { path: "/browse", icon: Home, label: "瀏覽" },
    { path: "/reviews", icon: PenLine, label: "心得" },
    { path: "/my/records", icon: NotebookPen, label: "紀錄" },
    { path: "/my", icon: BookOpen, label: "書架" },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="max-w-screen-xl mx-auto flex items-center h-16 sm:h-20 px-1 sm:px-4 gap-1">
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
                "relative flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 sm:gap-1 py-2 rounded-lg transition-all min-h-[44px]",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-xs sm:text-sm font-medium truncate max-w-full">{item.label}</span>
              {showBadge && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center px-1">
                  {pendingCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default Navigation
