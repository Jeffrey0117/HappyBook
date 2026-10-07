import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { selfize, type Book, type Profile, type HighlightColor } from "@/lib/selfize"
import { HL_CATEGORIES } from "@/components/SourceHighlighter"
import Navigation from "@/components/Navigation"
import { Loader2, BookOpen, MessageSquare, Sparkles, ArrowLeft } from "lucide-react"

interface PublicQuote {
  k: "hl" | "ul"
  c: HighlightColor
  text: string
}

interface PublicNote {
  text: string
  note: string
}

interface PublicRecord {
  id: string
  book_id: string
  chapter: string
  pages: string
  ai_summary: string
  my_note: string
  topic_tags: string[]
  created_at: string
  quotes: PublicQuote[]
  notes: PublicNote[]
}

const CATEGORY_ORDER: HighlightColor[] = ["p", "b", "y", "g", "r"]

const PublicShelf = () => {
  const { userId } = useParams()
  const [records, setRecords] = useState<PublicRecord[]>([])
  const [books, setBooks] = useState<Record<string, Book>>({})
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeBook, setActiveBook] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
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
        if (recs.length > 0) setActiveBook(recs[0].book_id)
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
        <p className="text-sm text-muted-foreground mb-6">
          {profile?.bio || "劃線引句與閱讀筆記，持續累積中。"}
        </p>

        {loading ? (
          <div className="flex justify-center pt-16"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : records.length === 0 ? (
          <div className="text-center pt-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>這個書牆還沒有公開的閱讀筆記。</p>
          </div>
        ) : (
          <>
            {/* 書封面牆 */}
            <div className="flex gap-3 overflow-x-auto pb-3 mb-4">
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
                  {rec.topic_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rec.topic_tags.map((t) => (
                        <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}

                  {rec.ai_summary ? (
                    <div className="mt-3 text-sm bg-muted/60 rounded-lg p-3 whitespace-pre-line">
                      <p className="font-medium mb-1 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> 重點整理</p>
                      {rec.ai_summary}
                    </div>
                  ) : null}

                  {rec.my_note ? (
                    <p className="text-sm mt-3 border-l-2 border-primary pl-2 whitespace-pre-line">💭 {rec.my_note}</p>
                  ) : null}

                  {CATEGORY_ORDER.map((c) => {
                    const qs = rec.quotes.filter((q) => q.k === "hl" && q.c === c)
                    if (qs.length === 0) return null
                    return (
                      <div key={c} className="mt-3">
                        <p className="text-xs font-medium flex items-center gap-1.5 mb-1">
                          <span className={`w-2.5 h-2.5 rounded-full ${HL_CATEGORIES[c].dot}`} />
                          {HL_CATEGORIES[c].label}
                        </p>
                        {qs.map((q, i) => (
                          <blockquote key={i} className={`text-sm rounded-md px-3 py-2 mb-1.5 ${HL_CATEGORIES[c].mark}`}>
                            {q.text}
                          </blockquote>
                        ))}
                      </div>
                    )
                  })}

                  {rec.quotes.some((q) => q.k === "ul") && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">底線</p>
                      {rec.quotes.filter((q) => q.k === "ul").map((q, i) => (
                        <blockquote key={i} className="text-sm border-l-2 border-foreground/30 pl-3 py-1 mb-1.5">
                          {q.text}
                        </blockquote>
                      ))}
                    </div>
                  )}

                  {rec.notes.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium flex items-center gap-1 text-muted-foreground mb-1">
                        <MessageSquare className="w-3.5 h-3.5" />批註
                      </p>
                      {rec.notes.map((n, i) => (
                        <div key={i} className="mb-2">
                          {n.text ? (
                            <p className="text-xs text-muted-foreground line-clamp-2">「{n.text}」</p>
                          ) : null}
                          <p className="text-sm border-l-2 border-primary pl-2 mt-0.5 whitespace-pre-line">💬 {n.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
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
