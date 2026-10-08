import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { selfize, type AppNotificationExpanded } from "@/lib/selfize"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useProfile } from "@/hooks/use-profile"
import { Bell, User } from "lucide-react"

const KIND_TEXT: Record<string, string> = {
  like_review: "給你的心得點了讚",
  comment_review: "留言了你的心得",
  like_post: "給你的貼文點了愛心",
  reply_post: "回覆了你的貼文",
  follow: "追蹤了你",
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr.replace(" ", "T") + "Z").getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "剛剛"
  if (min < 60) return `${min} 分鐘前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小時前`
  return `${Math.floor(hr / 24)} 天前`
}

/** 全站通知鈴鐺：未讀數徽章＋下拉列表，點了跳到對應位置 */
const NotificationBell = () => {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotificationExpanded[]>([])
  const [unread, setUnread] = useState(0)

  const fetchNotifs = async () => {
    if (!profile) return
    try {
      const { items: list } = await selfize.list<AppNotificationExpanded>("notifications", {
        user_id: profile.id,
        sort: "-created_at",
        limit: "20",
        expand: "actor_id",
      })
      setItems(list)
      setUnread(list.filter((n) => !n.read).length)
    } catch {
      // 靜默
    }
  }

  useEffect(() => {
    fetchNotifs()
    // 輕量輪詢：每 60 秒看一次有沒有新的
    const t = setInterval(fetchNotifs, 60000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  if (!profile) return null

  const openBell = async () => {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      // 打開即視為已讀
      const unreadItems = items.filter((n) => !n.read)
      setUnread(0)
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      for (const n of unreadItems) {
        try { await selfize.update("notifications", n.id, { read: true }) } catch {}
      }
    }
  }

  const go = (n: AppNotificationExpanded) => {
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={openBell}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="通知"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 max-w-[90vw] bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
            <p className="px-3 py-2 text-sm font-medium border-b border-border">通知</p>
            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-3 py-6 text-sm text-muted-foreground text-center">
                  還沒有通知——發幾篇心得讓大家有東西可以回應吧
                </p>
              ) : (
                items.map((n) => {
                  const actor = n.actor_id_expanded
                  return (
                    <button
                      key={n.id}
                      onClick={() => go(n)}
                      className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-muted transition-colors"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={actor?.avatar_url || undefined} />
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm leading-snug">
                          <span className="font-medium">{actor?.display_name || "有人"}</span>
                          {KIND_TEXT[n.kind] || "有新動靜"}
                        </p>
                        {n.ref_title && (
                          <p className="text-xs text-muted-foreground truncate">{n.ref_title}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationBell
