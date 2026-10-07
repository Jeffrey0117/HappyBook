import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { selfize, type Profile, type Book } from "@/lib/selfize"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import BookShelf from "@/components/BookShelf"
import ProfileCard from "@/components/ProfileCard"
import { ArrowLeft, BookOpen, NotebookPen, Instagram } from "lucide-react"
import { useGameStats } from "@/hooks/use-game-stats"
import { readCache, writeCache } from "@/lib/page-cache"

const UserShelf = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({}) // book_id → 公開筆記數
  const [loading, setLoading] = useState(true)
  const stats = useGameStats(id)

  useEffect(() => {
    // 快取先上（秒出），背景再抓最新
    const cached = readCache<{ profile: Profile; books: Book[]; noteCounts: Record<string, number> }>(`usershelf_${id}`)
    if (cached) {
      setProfile(cached.profile)
      setBooks(cached.books)
      setNoteCounts(cached.noteCounts || {})
      setLoading(false)
    }
    fetchUserData()
  }, [id])

  const fetchUserData = async () => {
    try {
      // profile 和書單平行抓
      const [profileData, { items }] = await Promise.all([
        selfize.get<Profile>("profiles", id!),
        selfize.list<Book>("books", { owner_id: id!, sort: "-created_at", limit: "500" }),
      ])
      setProfile(profileData)
      setBooks(items)
      const counts = await fetchNoteCounts(profileData.user_id)
      writeCache(`usershelf_${id}`, { profile: profileData, books: items, noteCounts: counts })
    } catch (error) {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const fetchNoteCounts = async (userId: string): Promise<Record<string, number>> => {
    try {
      const res = await fetch(`/api/public/records?user=${encodeURIComponent(userId)}`)
      const data = await res.json()
      if (!res.ok) return {}
      const counts: Record<string, number> = {}
      for (const rec of data.records || []) {
        counts[rec.book_id] = (counts[rec.book_id] || 0) + 1
      }
      setNoteCounts(counts)
      return counts
    } catch (error) {
      // 筆記提示載入失敗不影響書架
      return {}
    }
  }

  const notedBooks = books.filter((b) => noteCounts[b.id])

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

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* 新聞版型：左大欄＝書櫃，右側欄＝個人小面板 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
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
          </div>

          <aside className="space-y-4">
            {profile && (
              stats.loading
                ? <div className="h-44 bg-muted animate-pulse rounded-xl" />
                : <ProfileCard profile={profile} stats={stats} />
            )}

            {profile?.ig && (
              <a
                href={`https://instagram.com/${profile.ig.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-card border border-border rounded-xl p-4 hover:bg-muted transition-colors"
              >
                <Instagram className="w-5 h-5 text-pink-500" />
                <span className="text-sm font-medium">@{profile.ig.replace(/^@/, "")}</span>
              </a>
            )}

            {notedBooks.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <NotebookPen className="w-4 h-4 text-primary" />
                  有閱讀筆記的書
                </p>
                <div className="flex flex-col gap-1.5">
                  {notedBooks.map((b) => (
                    <Link
                      key={b.id}
                      to={`/book/${encodeURIComponent(b.title)}`}
                      className="text-sm bg-muted hover:bg-primary/10 px-3 py-2 rounded-lg transition-colors leading-snug"
                    >
                      《{b.title}》
                      <span className="text-muted-foreground ml-1 whitespace-nowrap">{noteCounts[b.id]} 筆</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      <Navigation />
    </div>
  )
}

export default UserShelf
