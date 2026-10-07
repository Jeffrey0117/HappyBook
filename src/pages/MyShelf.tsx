import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { selfize, type Book, type Profile } from "@/lib/selfize"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import BookShelf from "@/components/BookShelf"
import ProfileCard from "@/components/ProfileCard"
import OnboardingDialog from "@/components/OnboardingDialog"
import { Plus, BookOpen, Trash2, Edit, PenLine, LogIn, ArrowLeftRight } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import { useGameStats } from "@/hooks/use-game-stats"
import { useOnboarding } from "@/hooks/use-onboarding"
import { useSwapRequests } from "@/hooks/use-swap-requests"
import { Badge } from "@/components/ui/badge"

const MyShelf = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, isReady, login } = useAuth()
  const { profile, updateProfile } = useProfile()
  const stats = useGameStats(profile?.id)
  const { pendingCount } = useSwapRequests(isAuthenticated ? profile?.id : undefined)
  const [books, setBooks] = useState<Book[]>([])
  const [freshLoaded, setFreshLoaded] = useState(false)
  const [cached, setCached] = useState<{ profile: Profile; books: Book[] } | null>(null)

  const cacheKey = user ? `hb_myshelf_cache_${user.id}` : null

  // 先出快取（秒開），背景再同步最新資料
  useEffect(() => {
    if (!cacheKey) return
    try {
      const c = JSON.parse(localStorage.getItem(cacheKey) || "null")
      if (c?.profile) setCached(c)
    } catch {}
  }, [cacheKey])

  const { hasContact } = useOnboarding(profile, books)

  useEffect(() => {
    if (profile) fetchMyBooks()
  }, [profile])

  const fetchMyBooks = async () => {
    if (!profile) return
    try {
      const { items } = await selfize.list<Book>("books", {
        owner_id: profile.id,
        sort: "-created_at",
        limit: "500",
      })
      setBooks(items)
      setFreshLoaded(true)
      if (cacheKey) {
        try { localStorage.setItem(cacheKey, JSON.stringify({ profile, books: items })) } catch {}
      }
    } catch (error) {
      // 有快取撐著就安靜略過，沒有才報錯
      if (!cached) toast.error("無法載入書籍")
    }
  }

  const viewProfile = profile || cached?.profile || null
  const viewBooks = freshLoaded ? books : cached?.books || []
  const shelfLoading = !freshLoaded && !cached

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這本書嗎？")) return
    try {
      await selfize.delete("books", id)
      setBooks((prev) => prev.filter((b) => b.id !== id))
      setCached((c) => (c ? { ...c, books: c.books.filter((b) => b.id !== id) } : c))
      setFreshLoaded(true)
      toast.success("已刪除")
    } catch (error) {
      toast.error("刪除失敗")
    }
  }

  const handleOnboardingComplete = async (data: { contact_type: 'ig' | 'line'; contact_id: string; city: string }) => {
    if (!profile) return
    try {
      await updateProfile(data)
      toast.success('設定完成！')
    } catch (error) {
      toast.error('儲存失敗，請重試')
      throw error
    }
  }

  if (isReady && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 px-4">
          <LogIn className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg text-muted-foreground">請先登入以管理書架</p>
          <Button onClick={() => login()}>登入 / 註冊</Button>
        </div>
        <Navigation />
      </div>
    )
  }

  // 只有「第一次進站且沒有快取」才會看到整頁骨架
  if (!viewProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="h-40 bg-muted animate-pulse rounded-xl mt-16" />
        </div>
        <Navigation />
      </div>
    )
  }

  const getBookStatusBadge = (status: Book['status']) => {
    switch (status) {
      case 'swapping':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700">交換中</Badge>
      case 'swapped':
        return <Badge variant="secondary" className="bg-green-100 text-green-700">已換出</Badge>
      case 'lent_out':
        return <Badge variant="secondary">借出中</Badge>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">我的書架</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate("/swaps/inbox")} className="relative">
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                換書
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center px-1">
                    {pendingCount}
                  </span>
                )}
              </Button>
              <Button onClick={() => navigate("/my/add")}>
                <Plus className="h-4 w-4 mr-2" />
                上架新書
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {viewProfile && !stats.loading && (
          <ProfileCard profile={viewProfile} stats={stats} />
        )}

        {shelfLoading ? (
          <div className="h-60 bg-muted animate-pulse rounded-xl" />
        ) : viewBooks.length === 0 ? (
          <div className="text-center py-16 space-y-6">
            <BookOpen className="h-20 w-20 mx-auto text-muted-foreground/50" />
            <p className="text-xl font-medium text-muted-foreground">還沒有上架任何書</p>
            <Button onClick={() => navigate("/my/add")} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              上架第一本書
            </Button>
          </div>
        ) : (
          <BookShelf
            books={viewBooks}
            actions={(book) => (
              <div className="flex flex-wrap gap-2 items-center">
                {getBookStatusBadge(book.status)}
                <Button variant="outline" size="sm" onClick={() => navigate(`/book/${encodeURIComponent(book.title)}`)}>
                  <BookOpen className="h-3 w-3 mr-1" />
                  書籍頁
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/my/review/${book.id}`)}>
                  <PenLine className="h-3 w-3 mr-1" />
                  寫心得
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/my/edit/${book.id}`)}>
                  <Edit className="h-3 w-3 mr-1" />
                  編輯
                </Button>
                {book.status === 'available' && (
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(book.id)}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    刪除
                  </Button>
                )}
              </div>
            )}
          />
        )}
      </main>

      <OnboardingDialog
        open={!!(profile && !hasContact)}
        onComplete={handleOnboardingComplete}
      />

      <Navigation />
    </div>
  )
}

export default MyShelf
