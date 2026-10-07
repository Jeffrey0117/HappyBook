import { useState, useEffect, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { selfize, type BookWithOwner } from "@/lib/selfize"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import { readCache, writeCache } from "@/lib/page-cache"
import { Search, BookOpen, Users } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"

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
    const allTags = Array.from(new Set(groupBooks.flatMap((b) => b.tags || [])))
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

/** Netflix 式封面卡：橫滑列用固定寬，格狀用 fluid */
const CoverCard = ({ group, fluid = false }: { group: GroupedBook; fluid?: boolean }) => {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/book/${encodeURIComponent(group.title)}`)}
      className={`group text-left shrink-0 ${fluid ? "w-full" : "w-28 sm:w-36"}`}
      title={group.title}
    >
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-neutral-800 shadow-lg transition-transform duration-200 group-hover:scale-[1.04] group-hover:shadow-2xl group-hover:z-10">
        {group.cover_url ? (
          <img src={group.cover_url} alt={group.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-3 bg-gradient-to-br from-neutral-700 to-neutral-900">
            <span className="text-sm text-neutral-300 font-medium text-center line-clamp-4">{group.title}</span>
          </div>
        )}
      </div>
      <p className="mt-1.5 text-sm text-neutral-200 line-clamp-1">{group.title}</p>
      <p className="text-xs text-neutral-500 flex items-center gap-1">
        <Users className="w-3 h-3" />
        {group.ownerCount} 人擁有
      </p>
    </button>
  )
}

const Browse = () => {
  const navigate = useNavigate()
  const { login, logout, isAuthenticated } = useAuth()
  const { profile } = useProfile()
  const [books, setBooks] = useState<BookWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    // 快取先上（秒出），背景再抓最新
    const cached = readCache<BookWithOwner[]>("browse_books")
    if (cached) {
      setBooks(cached)
      setLoading(false)
    }
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
      writeCache("browse_books", items)
    } catch (error) {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const grouped = useMemo(() => groupBooksByTitle(books, profile?.id), [books, profile?.id])

  // 精選：有封面且最多人擁有的書
  const featured = useMemo(() => {
    const withCover = grouped.filter((g) => g.cover_url)
    if (withCover.length === 0) return null
    return [...withCover].sort((a, b) => b.ownerCount - a.ownerCount)[0]
  }, [grouped])

  // 分類橫滑列：書最多的標籤排前面
  const tagRows = useMemo(() => {
    const map = new Map<string, GroupedBook[]>()
    for (const g of grouped) {
      for (const t of g.tags) {
        const list = map.get(t)
        if (list) list.push(g)
        else map.set(t, [g])
      }
    }
    return [...map.entries()]
      .filter(([, list]) => list.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8)
  }, [grouped])

  const filtering = !!searchQuery.trim()
  const filteredGroups = useMemo(() => {
    if (!filtering) return grouped
    const q = searchQuery.toLowerCase().trim()
    return grouped.filter(
      (group) =>
        group.title.toLowerCase().includes(q) ||
        (group.author || "").toLowerCase().includes(q) ||
        group.tags.some((tag) => tag.toLowerCase().includes(q))
    )
  }, [grouped, searchQuery, filtering])

  return (
    <div className="min-h-screen bg-neutral-950 pb-24">
      {/* 頂欄 */}
      <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-lg border-b border-neutral-800">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="shrink-0 flex items-center gap-2 sm:gap-3 min-w-0">
              <img src="/logo-happybook.png" alt="HappyBook" className="h-10 sm:h-12 shrink-0" />
              <span className="text-lg sm:text-xl font-bold text-white whitespace-nowrap">換書不可</span>
            </Link>
            {/* 桌面：搜尋框在中間 */}
            <div className="relative hidden md:block flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <Input
                placeholder="搜尋書名、作者或標籤"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
              />
            </div>
            <div className="shrink-0">
              {isAuthenticated ? (
                <Button variant="ghost" size="sm" onClick={logout} className="text-neutral-400 hover:text-white hover:bg-neutral-800">
                  登出
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={login} className="border-neutral-700 bg-transparent text-white hover:bg-neutral-800 hover:text-white">
                  登入
                </Button>
              )}
            </div>
          </div>
          {/* 手機：搜尋框自己一排，不跟 LOGO 擠 */}
          <div className="relative md:hidden mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <Input
              placeholder="搜尋書名、作者或標籤"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
            />
          </div>

        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-10">
        {loading ? (
          /* 骨架：橫幅＋兩條封面列 */
          <>
            <div className="h-56 bg-neutral-900 animate-pulse rounded-2xl" />
            {[1, 2].map((r) => (
              <div key={r} className="space-y-3">
                <div className="h-6 w-28 bg-neutral-900 animate-pulse rounded" />
                <div className="flex gap-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-28 sm:w-36 shrink-0">
                      <div className="aspect-[2/3] bg-neutral-900 animate-pulse rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : filtering ? (
          /* 搜尋／篩選：封面格狀 */
          filteredGroups.length === 0 ? (
            <div className="text-center py-20 text-neutral-500">
              <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-40" />
              <p className="text-lg">找不到符合的書籍</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-neutral-500 mb-4">找到 {filteredGroups.length} 本書</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {filteredGroups.map((g) => (
                  <CoverCard key={g.title} group={g} fluid />
                ))}
              </div>
            </div>
          )
        ) : grouped.length === 0 ? (
          <div className="text-center py-20 text-neutral-500">
            <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg">還沒有人上架書籍</p>
          </div>
        ) : (
          <>
            {/* 精選橫幅 */}
            {featured && (
              <section
                className="relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 cursor-pointer group"
                onClick={() => navigate(`/book/${encodeURIComponent(featured.title)}`)}
              >
                {featured.cover_url && (
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-20 blur-2xl scale-110"
                    style={{ backgroundImage: `url(${featured.cover_url})` }}
                  />
                )}
                <div className="relative flex items-center gap-5 sm:gap-8 p-5 sm:p-8">
                  {featured.cover_url && (
                    <img
                      src={featured.cover_url}
                      alt={featured.title}
                      className="w-28 sm:w-40 rounded-lg shadow-2xl shrink-0 transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-400 mb-2 tracking-widest">精選書籍</p>
                    <h2 className="text-xl sm:text-3xl font-bold text-white leading-snug line-clamp-2">
                      {featured.title}
                    </h2>
                    {featured.author && (
                      <p className="text-neutral-400 mt-1">{featured.author}</p>
                    )}
                    <p className="text-sm text-neutral-500 mt-3 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {featured.ownerCount} 人擁有，點進去看筆記和心得
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* 最新上架 */}
            <section>
              <h2 className="text-lg font-bold text-white mb-3">最新上架</h2>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 -mx-4 px-4">
                {grouped.slice(0, 12).map((g) => (
                  <CoverCard key={g.title} group={g} />
                ))}
              </div>
            </section>

            {/* 分類橫滑列 */}
            {tagRows.map(([tag, list]) => (
              <section key={tag}>
                <h2 className="text-lg font-bold text-white mb-3">{tag}</h2>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 -mx-4 px-4">
                  {list.map((g) => (
                    <CoverCard key={`${tag}-${g.title}`} group={g} />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </main>

      <Navigation />
    </div>
  )
}

export default Browse
