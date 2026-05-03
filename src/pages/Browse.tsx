import { useState, useEffect, useRef, useMemo } from "react"
import { Link } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import BookCard from "@/components/BookCard"
import { BookCardSkeleton } from "@/components/ui/skeleton-loader"
import { Search, BookOpen } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { getLevelInfo } from "@/lib/game-config"

interface BookWithOwner {
  id: string
  title: string
  author: string
  cover_url: string | null
  tags: string[] | null
  status: string
  owner_id: string
  created_at: string
  profiles: { id: string; name: string; avatar_url: string | null } | null
}

const Browse = () => {
  const { login, logout, isAuthenticated } = useAuth()
  const [books, setBooks] = useState<BookWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [ownerBookCounts, setOwnerBookCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*, profiles(id, name, avatar_url)")
        .eq("status", "available")
        .order("created_at", { ascending: false })

      if (error) throw error
      const booksData = (data as BookWithOwner[]) || []
      setBooks(booksData)

      const counts: Record<string, number> = {}
      for (const b of booksData) {
        counts[b.owner_id] = (counts[b.owner_id] || 0) + 1
      }
      setOwnerBookCounts(counts)
    } catch (error) {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const ownerLevels = useMemo(() => {
    const levels: Record<string, { level: number; title: string }> = {}
    for (const [ownerId, count] of Object.entries(ownerBookCounts)) {
      const xp = count * 10
      const info = getLevelInfo(xp)
      levels[ownerId] = { level: info.level, title: info.title }
    }
    return levels
  }, [ownerBookCounts])

  const allTags = Array.from(
    new Set(books.flatMap((book) => book.tags || []))
  ).sort()

  const filteredBooks = books.filter((book) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q && !selectedTag) return true

    const matchesSearch = q
      ? book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        (book.tags && book.tags.some((tag) => tag.toLowerCase().includes(q)))
      : true

    const matchesTag = selectedTag ? book.tags?.includes(selectedTag) : true
    return matchesSearch && matchesTag
  })

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setIsSearching(true)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => setIsSearching(false), 300)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              換書不可
            </h1>
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link to="/my">
                  <Button variant="outline" size="sm">我的書架</Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout}>登出</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={login}>登入</Button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋書名、作者或標籤..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {searchQuery && !isSearching && (
            <div className="text-sm text-muted-foreground mt-2">
              找到 {filteredBooks.length} 本可換的書
            </div>
          )}

          {allTags.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              <Badge
                variant={selectedTag === null ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => setSelectedTag(null)}
              >
                全部
              </Badge>
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {loading || isSearching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-16 space-y-6">
            <BookOpen className="h-20 w-20 mx-auto text-muted-foreground/50" />
            <p className="text-xl font-medium text-muted-foreground">
              {searchQuery || selectedTag ? "找不到符合的書籍" : "還沒有人上架書籍"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                ownerName={book.profiles?.name || "未知"}
                ownerLevel={ownerLevels[book.owner_id]}
                showOwner
              />
            ))}
          </div>
        )}
      </main>

      <Navigation />
    </div>
  )
}

export default Browse
