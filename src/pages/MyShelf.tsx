import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Navigation from "@/components/Navigation"
import BookShelf from "@/components/BookShelf"
import ProfileCard from "@/components/ProfileCard"
import { Plus, BookOpen, Trash2, Edit, ArrowLeftRight, Undo2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import { useGameStats } from "@/hooks/use-game-stats"
import type { Book } from "@/integrations/supabase/types"

const MyShelf = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isReady, login } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const stats = useGameStats(profile?.id)
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  const [swapDialogBook, setSwapDialogBook] = useState<Book | null>(null)
  const [swapToName, setSwapToName] = useState("")
  const [swapNote, setSwapNote] = useState("")
  const [swapLoading, setSwapLoading] = useState(false)

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      login()
      return
    }
    if (profile) fetchMyBooks()
  }, [profile, isReady, isAuthenticated])

  const fetchMyBooks = async () => {
    if (!profile) return
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("owner_id", profile.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setBooks(data || [])
    } catch (error) {
      toast.error("無法載入書籍")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這本書嗎？")) return
    try {
      const { error } = await supabase.from("books").delete().eq("id", id)
      if (error) throw error
      setBooks(books.filter((b) => b.id !== id))
      toast.success("已刪除")
    } catch (error) {
      toast.error("刪除失敗")
    }
  }

  const handleLendOut = async () => {
    if (!swapDialogBook || !profile) return
    setSwapLoading(true)
    try {
      const { error: swapError } = await supabase.from("swaps").insert([{
        book_id: swapDialogBook.id,
        from_user_id: profile.id,
        to_user_id: profile.id,
        note: swapToName ? `換給 ${swapToName}${swapNote ? ` - ${swapNote}` : ''}` : swapNote || null,
        status: 'active',
      }])
      if (swapError) throw swapError

      const { error: bookError } = await supabase
        .from("books")
        .update({ status: 'lent_out' as const })
        .eq("id", swapDialogBook.id)
      if (bookError) throw bookError

      setBooks(books.map((b) =>
        b.id === swapDialogBook.id ? { ...b, status: 'lent_out' as const } : b
      ))
      setSwapDialogBook(null)
      setSwapToName("")
      setSwapNote("")
      toast.success("已記錄換出")
    } catch (error) {
      toast.error("操作失敗")
    } finally {
      setSwapLoading(false)
    }
  }

  const handleReturn = async (book: Book) => {
    try {
      const { data: activeSwap } = await supabase
        .from("swaps")
        .select("id")
        .eq("book_id", book.id)
        .eq("status", "active")
        .order("swapped_at", { ascending: false })
        .limit(1)
        .single()

      if (activeSwap) {
        await supabase
          .from("swaps")
          .update({ status: 'returned' as const, returned_at: new Date().toISOString() })
          .eq("id", activeSwap.id)
      }

      await supabase
        .from("books")
        .update({ status: 'available' as const })
        .eq("id", book.id)

      setBooks(books.map((b) =>
        b.id === book.id ? { ...b, status: 'available' as const } : b
      ))
      toast.success("已歸還")
    } catch (error) {
      toast.error("操作失敗")
    }
  }

  if (!isReady || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="h-40 bg-muted animate-pulse rounded-xl mt-16" />
        </div>
        <Navigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">我的書架</h1>
            <Button onClick={() => navigate("/my/add")}>
              <Plus className="h-4 w-4 mr-2" />
              上架新書
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {profile && !stats.loading && (
          <ProfileCard profile={profile} stats={stats} />
        )}

        {loading ? (
          <div className="h-60 bg-muted animate-pulse rounded-xl" />
        ) : books.length === 0 ? (
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
            books={books}
            actions={(book) => (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/my/edit/${book.id}`)}>
                  <Edit className="h-3 w-3 mr-1" />
                  編輯
                </Button>
                {book.status === 'available' ? (
                  <Button variant="outline" size="sm" onClick={() => setSwapDialogBook(book)}>
                    <ArrowLeftRight className="h-3 w-3 mr-1" />
                    記錄換出
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => handleReturn(book)}>
                    <Undo2 className="h-3 w-3 mr-1" />
                    已歸還
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => handleDelete(book.id)}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  刪除
                </Button>
              </div>
            )}
          />
        )}
      </main>

      <Dialog open={!!swapDialogBook} onOpenChange={(open) => { if (!open) setSwapDialogBook(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>記錄換出：{swapDialogBook?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>換給誰</Label>
              <Input
                value={swapToName}
                onChange={(e) => setSwapToName(e.target.value)}
                placeholder="對方名字（選填）"
              />
            </div>
            <div className="space-y-2">
              <Label>備註</Label>
              <Input
                value={swapNote}
                onChange={(e) => setSwapNote(e.target.value)}
                placeholder="備註（選填）"
              />
            </div>
            <Button className="w-full" onClick={handleLendOut} disabled={swapLoading}>
              {swapLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />處理中...</>
              ) : (
                <>
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  確認換出
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Navigation />
    </div>
  )
}

export default MyShelf
