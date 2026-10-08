import { Link } from "react-router-dom"
import UserMenu from "@/components/UserMenu"
import NotificationBell from "@/components/NotificationBell"

/**
 * 全站統一頂欄：左 LOGO＋品牌（回首頁）、中間放各頁自己的內容
 * （搜尋框、標題、動作鈕），右邊固定是會員頭像選單。主題色跟著深淺切換。
 */
const AppHeader = ({ children }: { children?: React.ReactNode }) => {
  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-screen-xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <Link to="/" className="shrink-0 flex items-center gap-2">
          <img src="/logo-happybook.png" alt="HappyBook" className="h-9 rounded-md" />
          <span className="font-bold whitespace-nowrap hidden sm:inline">換書不可</span>
        </Link>
        <div className="flex-1 min-w-0 flex items-center gap-3">{children}</div>
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}

export default AppHeader
