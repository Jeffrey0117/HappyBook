import { Link, useLocation } from "react-router-dom"
import { Home, BookOpen, Plus, History } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"

const Navigation = () => {
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  const navItems = [
    { path: "/", icon: Home, label: "瀏覽" },
    ...(isAuthenticated
      ? [
          { path: "/my", icon: BookOpen, label: "書架" },
          { path: "/my/add", icon: Plus, label: "上架" },
          { path: "/swaps", icon: History, label: "紀錄" },
        ]
      : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="max-w-screen-xl mx-auto flex justify-around items-center h-20 px-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-6 py-3 rounded-lg transition-all min-h-[44px] min-w-[44px]",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default Navigation
