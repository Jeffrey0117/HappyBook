import { Link, useLocation } from "react-router-dom"
import { Home, BookOpen, Plus, ArrowLeftRight, PenLine, MessageCircleQuestion } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import { useSwapRequests } from "@/hooks/use-swap-requests"

const Navigation = () => {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const { profile } = useProfile()
  const { pendingCount } = useSwapRequests(isAuthenticated ? profile?.id : undefined)

  const navItems = [
    { path: "/", icon: Home, label: "瀏覽" },
    { path: "/reviews", icon: PenLine, label: "心得" },
    ...(isAuthenticated
      ? [
          { path: "/swaps/inbox", icon: ArrowLeftRight, label: "換書" },
          { path: "/ask", icon: MessageCircleQuestion, label: "問書" },
          { path: "/my", icon: BookOpen, label: "書架" },
        ]
      : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="max-w-screen-xl mx-auto flex justify-around items-center h-20 px-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path ||
            (item.path === '/swaps/inbox' && location.pathname.startsWith('/swaps')) ||
            (item.path === '/reviews' && location.pathname.startsWith('/reviews'))
          const showBadge = item.path === '/swaps/inbox' && pendingCount > 0
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 px-6 py-3 rounded-lg transition-all min-h-[44px] min-w-[44px]",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-medium">{item.label}</span>
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
