import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import BookCard from "@/components/BookCard"
import { BookCardSkeleton } from "@/components/ui/skeleton-loader"
import { Plus, BookOpen, Trash2, Edit } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import type { Book } from "@/integrations/supabase/types"

const MyShelf = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isReady, login } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

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

  if (!isReady || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-16">
            {[1, 2, 3].map((i) => <BookCardSkeleton key={i} />)}
          </div>
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

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <BookCardSkeleton key={i} />)}
          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                actions={
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/my/edit/${book.id}`)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      編輯
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(book.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      刪除
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </main>

      <Navigation />
    </div>
  )
}

export default MyShelf
