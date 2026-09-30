import { useState, useEffect, useRef, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { selfize, type BookWithOwner, type Book } from "@/lib/selfize"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import Footer from "@/components/Footer"
import { BookCardSkeleton } from "@/components/ui/skeleton-loader"
import { Search, BookOpen, BookMarked, Edit, FileText, Users } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import { useMyBooks } from "@/hooks/use-my-books"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface GroupedBook {
  title: string
  author: string | null
  cover_url: string | null
  tags: string[]
  ownerCount: number
  ownBookId: string | null
}

function groupBooksByTitle(
  books: BookWithOwner[],
  myProfileId: string | undefined
): GroupedBook[] {
  const groups = new Map<string, BookWithOwner[]>()

  for (const book of books) {
    const key = book.title.toLowerCase().trim()
    const existing = groups.get(key)
    if (existing) {
      existing.push(book)
    } else {
      groups.set(key, [book])
    }
  }

  const result: GroupedBook[] = []

  for (const [, groupBooks] of groups) {
    const coverUrl = groupBooks.find((b) => b.cover_url)?.cover_url || null
    const author = groupBooks.find((b) => b.author)?.author || null
    const uniqueOwners = new Set(groupBooks.map((b) => b.owner_id))
    const allTags = Array.from(
      new Set(groupBooks.flatMap((b) => b.tags || []))
    )
    const ownBook = myProfileId
      ? groupBooks.find((b) => b.owner_id === myProfileId)
      : undefined

    result.push({
      title: groupBooks[0].title,
      author,
      cover_url: coverUrl,
      tags: allTags,
      ownerCount: uniqueOwners.size,
      ownBookId: ownBook?.id || null,
    })
  }

  return result
}

const Browse = () => {
  const navigate = useNavigate()
  const { login, logout, isAuthenticated } = useAuth()
  const { profile } = useProfile()
  const { books: myAllBooks } = useMyBooks(profile?.id)
  const [books, setBooks] = useState<BookWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    try {
      const { items } = await selfize.list<BookWithOwner>("books", {
        status: "available",
        sort: "-created_at",
        limit: "500",
        expand: "owner_id",
      })

      setBooks(items)
    } catch (error) {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const grouped = useMemo(
    () => groupBooksByTitle(books, profile?.id),
    [books, profile?.id]
  )

  const allTags = useMemo(
    () => Array.from(new Set(grouped.flatMap((g) => g.tags))).sort(),
    [grouped]
  )

  const filteredGroups = useMemo(() => {
    return grouped.filter((group) => {
      const q = searchQuery.toLowerCase().trim()
      if (!q && !selectedTag) return true

      const matchesSearch = q
        ? group.title.toLowerCase().includes(q) ||
          (group.author || "").toLowerCase().includes(q) ||
          group.tags.some((tag) => tag.toLowerCase().includes(q))
        : true

      const matchesTag = selectedTag ? group.tags.includes(selectedTag) : true
      return matchesSearch && matchesTag
    })
  }, [grouped, searchQuery, selectedTag])

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
              找到 {filteredGroups.length} 本可換的書
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
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-16 space-y-6">
            <BookOpen className="h-20 w-20 mx-auto text-muted-foreground/50" />
            <p className="text-xl font-medium text-muted-foreground">
              {searchQuery || selectedTag ? "找不到符合的書籍" : "還沒有人上架書籍"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group) => (
              <Card
                key={group.title}
                className="group hover:shadow-md transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                onClick={() => navigate(`/book/${encodeURIComponent(group.title)}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors">
                        {group.title}
                      </CardTitle>
                      {group.author && (
                        <p className="text-sm text-muted-foreground mt-1">{group.author}</p>
                      )}
                    </div>
                    {group.cover_url ? (
                      <img
                        src={group.cover_url}
                        alt={group.title}
                        className="w-12 h-16 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <BookMarked className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="gap-1">
                      <Users className="h-3 w-3" />
                      {group.ownerCount} 人擁有
                    </Badge>
                  </div>
                  {group.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {group.tags.slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                          {tag}
                        </Badge>
                      ))}
                      {group.tags.length > 4 && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          +{group.tags.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}
                  {group.ownBookId && (
                    <div className="pt-2 border-t flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/my/edit/${group.ownBookId}`)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        編輯
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/my/review/${group.ownBookId}`)}
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        寫心得
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
      <Navigation />
    </div>
  )
}

export default Browse
