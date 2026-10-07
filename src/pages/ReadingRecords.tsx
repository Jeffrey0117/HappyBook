import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { selfize, selfizeUser, type Book, type ReadingRecord, type Highlight } from "@/lib/selfize"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import AppHeader from "@/components/AppHeader"
import SourceHighlighter, { HL_CATEGORIES } from "@/components/SourceHighlighter"
import type { HighlightColor } from "@/lib/selfize"
import { ArrowLeft, Plus, Loader2, BookOpen, MessageCircleQuestion, Trash2, LogIn, ChevronDown, ChevronUp, Sparkles, Globe, Lock, Eye, EyeOff, Library } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"

const ReadingRecords = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, isReady, login } = useAuth()
  const { profile } = useProfile()
  const [records, setRecords] = useState<ReadingRecord[]>([])
  const [books, setBooks] = useState<Record<string, Book>>({})
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [hideMarks, setHideMarks] = useState(false) // 展演模式：先給大家看乾淨原文
  const [shareQuote, setShareQuote] = useState<{ rec: ReadingRecord; quote: { text: string; c: HighlightColor } } | null>(null)
  const [shareText, setShareText] = useState("")
  const [sharing, setSharing] = useState(false)

  const cacheKey = user ? `hb_records_cache_${user.id}` : null

  // 先出快取（秒開），再背景更新
  useEffect(() => {
    if (!cacheKey) return
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null")
      if (cached?.records) {
        setRecords(cached.records)
        setBooks(cached.books || {})
        setLoading(false)
      }
    } catch {}
  }, [cacheKey])

  useEffect(() => {
    if (isReady && isAuthenticated) fetchData()
    if (isReady && !isAuthenticated) setLoading(false)
  }, [isReady, isAuthenticated])

  const fetchData = async () => {
    try {
      const [{ items }, { items: allBooks }] = await Promise.all([
        selfizeUser.list<ReadingRecord>("reading_records", { perPage: "200", sort: "-created_at" }),
        selfize.list<Book>("books", { perPage: "200" }),
      ])
      const map: Record<string, Book> = {}
      for (const b of allBooks) map[b.id] = b
      setRecords(items)
      setBooks(map)
      if (cacheKey) {
        try { localStorage.setItem(cacheKey, JSON.stringify({ records: items, books: map })) } catch {}
      }
    } catch (error) {
      // 快取已經顯示內容的話，背景更新失敗就安靜略過
      if (records.length === 0) toast.error("載入閱讀紀錄失敗")
    } finally {
      setLoading(false)
    }
  }

  const handleHighlights = async (rec: ReadingRecord, next: Highlight[]) => {
    const updatedRecords = records.map((r) => (r.id === rec.id ? { ...r, highlights: next } : r))
    setRecords(updatedRecords)
    if (cacheKey) {
      try { localStorage.setItem(cacheKey, JSON.stringify({ records: updatedRecords, books })) } catch {}
    }
    try {
      await selfizeUser.update("reading_records", rec.id, { highlights: next })
    } catch (error) {
      toast.error("標註儲存失敗，再試一次")
    }
  }

  const handleVisibility = async (rec: ReadingRecord) => {
    const next = rec.visibility === "public" ? "private" : "public"
    const updatedRecords = records.map((r) => (r.id === rec.id ? { ...r, visibility: next } : r))
    setRecords(updatedRecords)
    if (cacheKey) {
      try { localStorage.setItem(cacheKey, JSON.stringify({ records: updatedRecords, books })) } catch {}
    }
    try {
      await selfizeUser.update("reading_records", rec.id, { visibility: next })
      toast.success(next === "public" ? "已公開：這筆會以引句＋批註出現在你的書牆" : "已設為私人")
      if (next === "public") createRecordPost(rec)
    } catch (error) {
      toast.error("切換失敗，再試一次")
    }
  }

  // 公開紀錄自動進動態 feed（同一筆只發一次，失敗靜默）
  const createRecordPost = async (rec: ReadingRecord) => {
    if (!profile) return
    try {
      const { items } = await selfize.list("posts", { ref_id: rec.id, limit: "1" })
      if (items.length > 0) return
      const book = books[rec.book_id]
      const text = rec.source_text || ""
      const firstHl = (rec.highlights || []).find((h) => h.k === "hl" && text.slice(h.s, h.e).trim())
      await selfize.create("posts", {
        user_id: profile.id,
        text: rec.my_note?.trim() || `公開了《${book?.title || "一本書"}》的閱讀筆記`,
        book_id: rec.book_id,
        book_title: book?.title || null,
        book_cover: book?.cover_url || null,
        quote: firstHl ? { text: text.slice(firstHl.s, firstHl.e).slice(0, 120), c: firstHl.c || "y" } : null,
        kind: "record",
        ref_id: rec.id,
        likes: [],
      })
    } catch {}
  }

  const handleShare = async () => {
    if (!profile || !shareQuote) return
    setSharing(true)
    try {
      const book = books[shareQuote.rec.book_id]
      await selfize.create("posts", {
        user_id: profile.id,
        text: shareText.trim() || `《${book?.title || "一本書"}》的這段，分享給大家`,
        book_id: shareQuote.rec.book_id,
        book_title: book?.title || null,
        book_cover: book?.cover_url || null,
        quote: shareQuote.quote,
        kind: "post",
        likes: [],
      })
      toast.success("已發到動態！")
      setShareQuote(null)
    } catch (error) {
      toast.error("發布失敗，再試一次")
    } finally {
      setSharing(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("刪除這筆閱讀紀錄？")) return
    try {
      await selfizeUser.delete("reading_records", id)
      setRecords((prev) => prev.filter((r) => r.id !== id))
      toast.success("已刪除")
    } catch (error) {
      toast.error("刪除失敗")
    }
  }

  if (isReady && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-screen-md mx-auto px-4 pt-16 text-center">
          <p className="text-muted-foreground mb-4">登入後開始累積你的私人閱讀資料庫</p>
          <Button onClick={login}><LogIn className="w-4 h-4 mr-2" />登入</Button>
        </div>
        <Navigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader>
        <h1 className="text-lg sm:text-xl font-bold truncate">閱讀紀錄</h1>
      </AppHeader>
      <div className="max-w-screen-md mx-auto px-4 pt-6">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
          <button onClick={() => navigate("/my")} className="flex items-center text-muted-foreground text-sm shrink-0">
            <ArrowLeft className="w-4 h-4 mr-1" /> 我的書架
          </button>
          <div className="flex gap-2 flex-wrap justify-end">
            {user && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/shelf/${user.id}`}><Library className="w-4 h-4 mr-1" />公開書牆</Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to="/ask"><MessageCircleQuestion className="w-4 h-4 mr-1" />問我的書</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/my/records/add"><Plus className="w-4 h-4 mr-1" />新增紀錄</Link>
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6 mt-2">
          預設私人（原文與心得只有你和 AI 討論室看得到）；設為公開的紀錄會以「引句＋批註」出現在你的公開書牆。
        </p>

        {loading ? (
          <div className="flex justify-center pt-16"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : records.length === 0 ? (
          <div className="text-center pt-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="mb-4">還沒有閱讀紀錄。拍幾頁正在讀的書，開始累積吧。</p>
            <Button asChild><Link to="/my/records/add"><Plus className="w-4 h-4 mr-1" />第一筆紀錄</Link></Button>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((rec) => (
              <div key={rec.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      《{books[rec.book_id]?.title || "未知書籍"}》
                      {rec.chapter ? <span className="text-muted-foreground font-normal">　{rec.chapter}</span> : null}
                      {rec.pages ? <span className="text-muted-foreground font-normal">　p.{rec.pages}</span> : null}
                    </p>
                    {(rec.topic_tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(rec.topic_tags || []).map((t) => (
                          <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleVisibility(rec)}
                      className={rec.visibility === "public" ? "text-primary" : "text-muted-foreground hover:text-foreground"}
                      title={rec.visibility === "public" ? "公開中（點擊改為私人）" : "私人（點擊公開到書牆）"}
                    >
                      {rec.visibility === "public" ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(rec.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {expandedId === rec.id ? (
                  <>
                    {rec.ai_summary ? (
                      <div className="mt-3 text-sm bg-muted/60 rounded-lg p-3 whitespace-pre-line">
                        <p className="font-medium mb-1 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> AI 重點</p>
                        {rec.ai_summary}
                      </div>
                    ) : null}
                    {rec.my_note ? (
                      <p className="text-sm mt-2 border-l-2 border-primary pl-2 whitespace-pre-line">💭 {rec.my_note}</p>
                    ) : null}
                    {rec.source_text ? (
                      <div className="mt-3 border-t border-border pt-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <p className="text-xs text-muted-foreground">
                            選取文字：螢光筆／底線／批註。分類：
                            <span className="text-purple-600 dark:text-purple-400 font-medium">⚑立場</span>
                            <span className="text-blue-600 dark:text-blue-400 font-medium">★核心</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">＋正例</span>
                            <span className="text-red-600 dark:text-red-400 font-medium">−反例</span>
                          </p>
                          <button
                            onClick={() => setHideMarks(!hideMarks)}
                            className="flex items-center gap-1 text-xs text-primary shrink-0"
                          >
                            {hideMarks ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            {hideMarks ? "顯示標註" : "隱藏標註（展演）"}
                          </button>
                        </div>
                        <SourceHighlighter
                          text={rec.source_text}
                          highlights={rec.highlights || []}
                          onChange={(next) => handleHighlights(rec, next)}
                          showMarks={!hideMarks}
                          onShareQuote={(q) => {
                            setShareQuote({ rec, quote: q })
                            setShareText("")
                          }}
                        />
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    {rec.source_text ? (
                      <p
                        className="text-sm mt-2 text-muted-foreground line-clamp-3 whitespace-pre-line cursor-pointer"
                        onClick={() => setExpandedId(rec.id)}
                      >
                        {rec.source_text}
                      </p>
                    ) : null}
                    {rec.my_note ? (
                      <p className="text-sm mt-2 border-l-2 border-primary pl-2 whitespace-pre-line line-clamp-2">💭 {rec.my_note}</p>
                    ) : null}
                  </>
                )}
                {rec.source_text || rec.ai_summary ? (
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                      className="flex items-center gap-1 text-sm text-primary"
                    >
                      {expandedId === rec.id
                        ? <><ChevronUp className="w-4 h-4" />收合</>
                        : <><ChevronDown className="w-4 h-4" />閱讀全文</>}
                    </button>
                    {expandedId !== rec.id && (rec.highlights || []).filter((h) => h.k === "note").length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        💬 {(rec.highlights || []).filter((h) => h.k === "note").length} 則批註
                      </span>
                    )}
                  </div>
                ) : null}
                {(rec.images || []).length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto">
                    {(rec.images || []).map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="書頁" className="h-16 rounded-md border border-border" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* 劃線發成貼文 */}
      {shareQuote && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/50" onClick={() => setShareQuote(null)} />
          <div className="fixed z-[80] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md bg-card border border-border rounded-2xl p-4 shadow-2xl">
            <p className="font-semibold mb-2">發成貼文</p>
            <blockquote className={`text-sm rounded-md px-3 py-2 mb-3 ${HL_CATEGORIES[shareQuote.quote.c]?.mark || "bg-muted"}`}>
              「{shareQuote.quote.text}」
            </blockquote>
            <textarea
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              rows={3}
              autoFocus
              placeholder="配一句你的話（你的想法才是貼文的主角）"
              className="w-full text-sm rounded-md border border-input bg-background p-2 resize-none"
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => setShareQuote(null)}>取消</Button>
              <Button size="sm" onClick={handleShare} disabled={sharing}>
                {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : "發布"}
              </Button>
            </div>
          </div>
        </>
      )}

      <Navigation />
    </div>
  )
}

export default ReadingRecords
