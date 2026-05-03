import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { selfize, type Profile, type Book } from "@/lib/selfize"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import BookShelf from "@/components/BookShelf"
import ProfileCard from "@/components/ProfileCard"
import { ArrowLeft, BookOpen } from "lucide-react"
import { useGameStats } from "@/hooks/use-game-stats"

const UserShelf = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const stats = useGameStats(id)

  useEffect(() => {
    fetchUserData()
  }, [id])

  const fetchUserData = async () => {
    try {
      const profileData = await selfize.get<Profile>("profiles", id!)
      setProfile(profileData)

      const { items } = await selfize.list<Book>("books", {
        owner_id: id!,
        sort: "-created_at",
        limit: "500",
      })
      setBooks(items)
    } catch (error) {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          {profile && (
            <h1 className="text-xl font-bold">{profile.display_name} 的書架</h1>
          )}
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {profile && !stats.loading && (
          <ProfileCard profile={profile} stats={stats} />
        )}

        {loading ? (
          <div className="h-60 bg-muted animate-pulse rounded-xl" />
        ) : books.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-20 w-20 mx-auto text-muted-foreground/50" />
            <p className="text-xl font-medium text-muted-foreground mt-4">這個人還沒上架任何書</p>
          </div>
        ) : (
          <BookShelf books={books} />
        )}
      </main>

      <Navigation />
    </div>
  )
}

export default UserShelf
