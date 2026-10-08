import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { selfize, type Book, type Profile, type Review } from "@/lib/selfize"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import AppHeader from "@/components/AppHeader"
import BookShelf from "@/components/BookShelf"
import ProfileCard from "@/components/ProfileCard"
import OnboardingDialog from "@/components/OnboardingDialog"
import { Plus, BookOpen, Trash2, Edit, PenLine, LogIn, ArrowLeftRight, Pencil, Loader2 } from "lucide-react"
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
  const [reviews, setReviews] = useState<Review[]>([])
  const [freshLoaded, setFreshLoaded] = useState(false)
  const [cached, setCached] = useState<{ profile: Profile; books: Book[]; reviews?: Review[] } | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ display_name: "", bio: "", city: "", ig: "", avatar_url: "", contact_type: "" as "" | "ig" | "line", contact_id: "" })
  const [savingProfile, setSavingProfile] = useState(false)

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

  // 從頭像選單「編輯個人資料」進來（/my?edit=1）→ 直接開編輯視窗
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get("edit") && (profile || cached?.profile)) {
      openEdit()
      searchParams.delete("edit")
      setSearchParams(searchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, profile, cached])

  useEffect(() => {
    if (profile) fetchMyBooks()
  }, [profile])

  const fetchMyBooks = async () => {
    if (!profile) return
    try {
      const [{ items }, { items: reviewItems }] = await Promise.all([
        selfize.list<Book>("books", { owner_id: profile.id, sort: "-created_at", limit: "500" }),
        selfize.list<Review>("reviews", { user_id: profile.id, sort: "-created_at", limit: "50" }),
      ])
      setBooks(items)
      setReviews(reviewItems)
      setFreshLoaded(true)
      if (cacheKey) {
        try { localStorage.setItem(cacheKey, JSON.stringify({ profile, books: items, reviews: reviewItems })) } catch {}
      }
    } catch (error) {
      // 有快取撐著就安靜略過，沒有才報錯
      if (!cached) toast.error("無法載入書籍")
    }
  }

  const openEdit = () => {
    const p = profile || cached?.profile
    setEditForm({
      display_name: p?.display_name || "",
      bio: p?.bio || "",
      city: p?.city || "",
      ig: p?.ig || "",
      avatar_url: p?.avatar_url || "",
      contact_type: (p?.contact_type as "" | "ig" | "line") || "",
      contact_id: p?.contact_id || "",
    })
    setEditOpen(true)
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      if (!editForm.display_name.trim()) {
        toast.error("名稱不能空白")
        setSavingProfile(false)
        return
      }
      await updateProfile({
        display_name: editForm.display_name.trim(),
        bio: editForm.bio.trim() || null,
        city: editForm.city.trim() || null,
        ig: editForm.ig.trim().replace(/^@/, "") || null,
        avatar_url: editForm.avatar_url.trim() || null,
        contact_type: editForm.contact_type || null,
        contact_id: editForm.contact_id.trim() || null,
      })
      toast.success("個人資料已更新")
      setEditOpen(false)
    } catch (error) {
      toast.error("儲存失敗，再試一次")
    } finally {
      setSavingProfile(false)
    }
  }

  const viewProfile = profile || cached?.profile || null
  const viewBooks = freshLoaded ? books : cached?.books || []
  const viewReviews = freshLoaded ? reviews : cached?.reviews || []
  const shelfLoading = !freshLoaded && !cached

  // 心得摘要：去掉 markdown 記號
  const excerptOf = (md: string) =>
    md
      .split("\n")
      .map((l) => l.replace(/^[#>\-*\s]+/, "").trim())
      .filter(Boolean)
      .join(" ")
      .slice(0, 160)

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
      <AppHeader>
        <h1 className="text-lg sm:text-xl font-bold truncate">我的書架</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/swaps/inbox")} className="relative">
            <ArrowLeftRight className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">換書</span>
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center px-1">
                {pendingCount}
              </span>
            )}
          </Button>
          <Button size="sm" onClick={() => navigate("/my/add")}>
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">上架新書</span>
          </Button>
        </div>
      </AppHeader>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {viewProfile && (
          stats.loading
            ? <div className="h-56 bg-muted animate-pulse rounded-xl" />
            : (
              <div className="relative">
                <ProfileCard profile={viewProfile} stats={stats} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openEdit}
                  className="absolute top-3 right-3"
                >
                  <Pencil className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">編輯個人資料</span>
                </Button>
              </div>
            )
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

        {/* 我的心得文（Medium 列表＋編輯） */}
        {viewReviews.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4">我的心得</h2>
            <div className="space-y-6">
              {viewReviews.map((review) => {
                const cover = viewBooks.find((b) => b.id === review.book_id)?.cover_url || null
                return (
                  <Link key={review.id} to={`/book/${encodeURIComponent(review.book_title)}`} className="block group">
                    <div className="flex gap-4 items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-xl font-bold group-hover:text-primary transition-colors leading-snug">
                            {review.title || `《${review.book_title}》`}
                          </h3>
                          {review.rating === "up" && (
                            <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-400 px-2 py-0.5 rounded-full shrink-0">👍 推</span>
                          )}
                          {review.rating === "down" && (
                            <span className="text-xs font-medium text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400 px-2 py-0.5 rounded-full shrink-0">👎 倒讚</span>
                          )}
                        </div>
                        {review.title && <p className="text-sm text-muted-foreground mb-1">《{review.book_title}》</p>}
                        <p className="text-muted-foreground leading-relaxed line-clamp-3">{excerptOf(review.content)}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(review.created_at).toLocaleDateString("zh-TW", { year: "numeric", month: "short", day: "numeric" })}
                          　·　閱讀全文 →
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              navigate(`/my/review/${review.book_id}`)
                            }}
                            className="ml-3 text-primary hover:underline"
                          >
                            編輯
                          </button>
                        </p>
                      </div>
                      {cover && (
                        <img src={cover} alt={review.book_title} className="w-16 sm:w-20 aspect-[2/3] object-cover rounded-md border border-border shadow-sm shrink-0" />
                      )}
                    </div>
                    <div className="border-b border-border mt-6" />
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </main>

      {/* 編輯個人資料 */}
      {editOpen && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/50" onClick={() => setEditOpen(false)} />
          <div className="fixed z-[80] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-md max-h-[85vh] overflow-y-auto bg-card border border-border rounded-2xl p-5 shadow-2xl space-y-4">
            <h2 className="font-bold text-lg">編輯個人資料</h2>
            <div>
              <label className="text-sm font-medium">顯示名稱</label>
              <input
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                className="mt-1 w-full h-10 text-base font-medium rounded-md border border-input bg-background px-3"
                placeholder="大家看到的名字"
              />
            </div>
            <div>
              <label className="text-sm font-medium">自我介紹</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                rows={3}
                className="mt-1 w-full text-sm rounded-md border border-input bg-background p-2 resize-none"
                placeholder="介紹一下你自己、你的讀書會…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">城市</label>
                <input
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="mt-1 w-full h-9 text-sm rounded-md border border-input bg-background px-2"
                  placeholder="台中"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Instagram</label>
                <input
                  value={editForm.ig}
                  onChange={(e) => setEditForm({ ...editForm, ig: e.target.value })}
                  className="mt-1 w-full h-9 text-sm rounded-md border border-input bg-background px-2"
                  placeholder="帳號名，不用 @"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">頭像網址</label>
              <div className="mt-1 flex items-center gap-3">
                {editForm.avatar_url ? (
                  <img
                    src={editForm.avatar_url}
                    alt="頭像預覽"
                    className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
                    onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.3")}
                    onLoad={(e) => ((e.target as HTMLImageElement).style.opacity = "1")}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted border border-border shrink-0" />
                )}
                <input
                  value={editForm.avatar_url}
                  onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                  className="flex-1 h-9 text-sm rounded-md border border-input bg-background px-2"
                  placeholder="貼圖片網址，左邊會即時預覽"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">聯絡方式</label>
                <select
                  value={editForm.contact_type}
                  onChange={(e) => setEditForm({ ...editForm, contact_type: e.target.value as "" | "ig" | "line" })}
                  className="mt-1 w-full h-9 text-sm rounded-md border border-input bg-background px-2"
                >
                  <option value="">不提供</option>
                  <option value="line">LINE</option>
                  <option value="ig">Instagram</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">聯絡 ID</label>
                <input
                  value={editForm.contact_id}
                  onChange={(e) => setEditForm({ ...editForm, contact_id: e.target.value })}
                  className="mt-1 w-full h-9 text-sm rounded-md border border-input bg-background px-2"
                  placeholder="換書時給對方看的"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>取消</Button>
              <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : "儲存"}
              </Button>
            </div>
          </div>
        </>
      )}

      <OnboardingDialog
        open={!!(profile && !hasContact)}
        onComplete={handleOnboardingComplete}
      />

      <Navigation />
    </div>
  )
}

export default MyShelf
