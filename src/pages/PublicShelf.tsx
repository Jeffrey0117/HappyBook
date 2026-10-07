import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { selfize, type Book, type Profile } from "@/lib/selfize"
import PublicRecordCard, { type PublicRecord } from "@/components/PublicRecordCard"
import Navigation from "@/components/Navigation"
import { readCache, writeCache } from "@/lib/page-cache"
import { BookOpen, ArrowLeft, Instagram } from "lucide-react"

const PublicShelf = () => {
  const { userId } = useParams()
  const [records, setRecords] = useState<PublicRecord[]>([])
  const [books, setBooks] = useState<Record<string, Book>>({})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeBook, setActiveBook] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    // 快取先上（秒出），背景再抓最新
    const cached = readCache<{ records: PublicRecord[]; books: Record<string, Book>; profile: Profile | null }>(`pubshelf_${userId}`)
    if (cached) {
      setRecords(cached.records)
      setBooks(cached.books)
      setProfile(cached.profile)
      if (cached.records.length > 0) setActiveBook(cached.records[0].book_id)
      setLoading(false)
    }
    const load = async () => {
      try {
        const [recRes, bookList, profList] = await Promise.all([
          fetch(`/api/public/records?user=${encodeURIComponent(userId)}`).then((r) => r.json()),
          selfize.list<Book>("books", { perPage: "200" }),
          selfize.list<Profile>("profiles", { user_id: userId, limit: "1" }),
        ])
        const recs: PublicRecord[] = recRes.records || []
        setRecords(recs)
        const map: Record<string, Book> = {}
        for (const b of bookList.items) map[b.id] = b
        setBooks(map)
        setProfile(profList.items[0] || null)
        setActiveBook((prev) => prev || (recs.length > 0 ? recs[0].book_id : null))
        writeCache(`pubshelf_${userId}`, { records: recs, books: map, profile: profList.items[0] || null })
      } catch {
        // 公開頁載入失敗就顯示空狀態
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  const bookIds = [...new Set(records.map((r) => r.book_id))]
  const activeRecords = records.filter((r) => r.book_id === activeBook)

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-md mx-auto px-4 pt-6">
        <Link to="/" className="flex items-center text-muted-foreground text-sm mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> HappyBook
        </Link>
        <h1 className="text-2xl font-bold mb-1">
          {profile?.display_name || "讀者"} 的閱讀書牆
        </h1>
        <p className="text-sm text-muted-foreground mb-2">
          {profile?.bio || "劃線引句與閱讀筆記，持續累積中。"}
        </p>
        {profile?.ig && (
          <a
            href={`https://instagram.com/${profile.ig.replace(/^@/, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-pink-500 hover:underline mb-4"
          >
            <Instagram className="w-4 h-4" />@{profile.ig.replace(/^@/, "")}
          </a>
        )}
        <div className="mb-4" />

        {loading ? (
          /* 骨架跟實際版型同構：封面列＋筆記卡 */
          <div>
            <div className="flex gap-3 pb-3 mb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-24 h-40 bg-muted animate-pulse rounded-lg shrink-0" />
              ))}
            </div>
            <div className="space-y-4">
              <div className="h-48 bg-muted animate-pulse rounded-xl" />
              <div className="h-32 bg-muted animate-pulse rounded-xl" />
            </div>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center pt-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>這個書牆還沒有公開的閱讀筆記。</p>
          </div>
        ) : (
          <>
            {/* 書封面牆 */}
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3 mb-4">
              {bookIds.map((id) => {
                const b = books[id]
                const count = records.filter((r) => r.book_id === id).length
                return (
                  <button
                    key={id}
                    onClick={() => setActiveBook(id)}
                    className={`shrink-0 w-24 text-left rounded-lg p-1 transition-all ${activeBook === id ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted"}`}
                  >
                    {b?.cover_url ? (
                      <img src={b.cover_url} alt={b.title} className="w-full h-32 object-cover rounded-md border border-border" />
                    ) : (
                      <div className="w-full h-32 rounded-md border border-border bg-muted flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-xs mt-1 line-clamp-2 font-medium">{b?.title || "未知書籍"}</p>
                    <p className="text-[10px] text-muted-foreground">{count} 筆筆記</p>
                  </button>
                )
              })}
            </div>

            {/* 筆記卡片（引句＋批註視圖） */}
            <div className="space-y-4">
              {activeRecords.map((rec) => (
                <div key={rec.id} className="bg-card border border-border rounded-xl p-4">
                  <p className="font-semibold">
                    《{books[rec.book_id]?.title || "未知書籍"}》
                    {rec.chapter ? <span className="text-muted-foreground font-normal">　{rec.chapter}</span> : null}
                    {rec.pages ? <span className="text-muted-foreground font-normal">　p.{rec.pages}</span> : null}
                  </p>
                  <PublicRecordCard record={rec} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <Navigation />
    </div>
  )
}

export default PublicShelf
