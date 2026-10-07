import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import { User, LogOut, BookOpen, NotebookPen, Library, UserCircle } from "lucide-react"

/** 全站共用的右上角會員選單：頭像 → 下拉；未登入 → 登入鈕 */
const UserMenu = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, login, logout } = useAuth()
  const { profile } = useProfile()
  const [open, setOpen] = useState(false)

  if (!isAuthenticated) {
    return (
      <Button size="sm" variant="outline" onClick={() => login()}>
        登入
      </Button>
    )
  }

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  const item = "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"

  return (
    <div className="relative shrink-0">
      <button onClick={() => setOpen(!open)} className="block rounded-full ring-1 ring-border hover:ring-primary transition-shadow">
        <Avatar className="h-9 w-9">
          <AvatarImage src={profile?.avatar_url || undefined} />
          <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
        </Avatar>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-popover border border-border rounded-xl shadow-xl py-1 overflow-hidden">
            <p className="px-3 py-2 text-sm font-medium border-b border-border truncate">
              {profile?.display_name || "讀者"}
            </p>
            {profile && (
              <button onClick={() => go(`/user/${profile.id}`)} className={item}>
                <UserCircle className="w-4 h-4 text-muted-foreground" />我的主頁
              </button>
            )}
            <button onClick={() => go("/my")} className={item}>
              <BookOpen className="w-4 h-4 text-muted-foreground" />我的書架
            </button>
            <button onClick={() => go("/my/records")} className={item}>
              <NotebookPen className="w-4 h-4 text-muted-foreground" />閱讀紀錄
            </button>
            {user && (
              <button onClick={() => go(`/shelf/${user.id}`)} className={item}>
                <Library className="w-4 h-4 text-muted-foreground" />公開書牆
              </button>
            )}
            <div className="border-t border-border my-1" />
            <button
              onClick={() => {
                setOpen(false)
                logout()
              }}
              className={`${item} text-destructive`}
            >
              <LogOut className="w-4 h-4" />登出
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default UserMenu
