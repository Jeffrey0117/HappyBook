import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import BookCard from "@/components/BookCard"
import { BookCardSkeleton } from "@/components/ui/skeleton-loader"
import { ArrowLeft, BookOpen, User } from "lucide-react"
import type { Profile, Book } from "@/integrations/supabase/types"

const UserShelf = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserData()
  }, [id])

  const fetchUserData = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      const { data: booksData, error: booksError } = await supabase
        .from("books")
        .select("*")
        .eq("owner_id", id)
        .order("created_at", { ascending: false })

      if (booksError) throw booksError
      setBooks(booksData || [])
    } catch (error) {
      console.error("Failed to load user:", error)
    } finally {
      setLoading(false)
    }
  }

  const availableBooks = books.filter((b) => b.status === "available")
  const swappedBooks = books.filter((b) => b.status === "swapped")

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          {profile && (
            <div className="flex items-center gap-3">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name} className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold">{profile.name} 的書架</h1>
                <p className="text-sm text-muted-foreground">
                  {availableBooks.length} 本可換 · {swappedBooks.length} 本已換出
                </p>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <BookCardSkeleton key={i} />)}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-20 w-20 mx-auto text-muted-foreground/50" />
            <p className="text-xl font-medium text-muted-foreground mt-4">這個人還沒上架任何書</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </main>

      <Navigation />
    </div>
  )
}

export default UserShelf
