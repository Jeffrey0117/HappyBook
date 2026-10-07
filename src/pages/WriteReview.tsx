import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { selfize, type Book, type Review } from "@/lib/selfize"
import RichEditor from "@/components/RichEditor"
import { readCache, writeCache } from "@/lib/page-cache"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import Navigation from "@/components/Navigation"
import { ArrowLeft, Loader2, Eye, Edit, LogIn, Sparkles, ThumbsUp, ThumbsDown, Code } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import ReactMarkdown from "react-markdown"
import { mdPreserveBreaks, reviewRehypePlugins } from "@/lib/markdown"

const WriteReview = () => {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, isReady, login } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [book, setBook] = useState<Book | null>(null)
  const [content, setContent] = useState("")
  const [existingReview, setExistingReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [rating, setRating] = useState<"up" | "down" | null>(null)
  const [title, setTitle] = useState("")
  const [editorMode, setEditorMode] = useState<"rich" | "md">("rich")
  const dirtyRef = useRef(false) // 使用者改過內容後，背景更新不准覆寫

  // 快取先上（秒開），背景再抓最新
  useEffect(() => {
    if (!bookId) return
    const cb = readCache<Book>(`wr_book_${bookId}`)
    if (cb) {
      setBook(cb)
      setLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    if (profile && bookId) {
      const cr = readCache<Review>(`wr_rev_${profile.id}_${bookId}`)
      if (cr && !dirtyRef.current) {
        setExistingReview(cr)
        setContent(cr.content)
        setRating(cr.rating || null)
        setTitle(cr.title || "")
        setLoading(false)
      }
      fetchData()
    }
  }, [profile, bookId])

  const fetchData = async () => {
    if (!bookId || !profile) return
    try {
      const [bookData, { items }] = await Promise.all([
        selfize.get<Book>("books", bookId),
        selfize.list<Review>("reviews", { user_id: profile.id, book_id: bookId, limit: "1" }),
      ])
      setBook(bookData)
      writeCache(`wr_book_${bookId}`, bookData)
      if (items.length > 0) {
        setExistingReview(items[0])
        writeCache(`wr_rev_${profile.id}_${bookId}`, items[0])
        if (!dirtyRef.current) {
          setContent(items[0].content)
          setRating(items[0].rating || null)
          setTitle(items[0].title || "")
        }
      }
    } catch (error) {
      if (!book) {
        toast.error("無法載入書籍資料")
        navigate("/my")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDraft = async () => {
    if (!bookId) return
    if (content.trim() && !confirm("生成草稿會覆蓋目前的內容，確定？")) return
    setDrafting(true)
    try {
      const res = await fetch("/api/draft-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${window.letmeuse?.getToken?.() || ""}`,
        },
        body: JSON.stringify({ book_id: bookId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setContent(data.draft)
      dirtyRef.current = true
      setPreviewing(false)
      toast.success("草稿好了，改成你自己的話再發表")
    } catch (error: any) {
      toast.error(error.message || "草稿生成失敗")
    } finally {
      setDrafting(false)
    }
  }

  const handleSubmit = async () => {
    if (!profile || !book || !content.trim()) return
    setSubmitting(true)
    try {
      if (existingReview) {
        await selfize.update("reviews", existingReview.id, {
          content: content.trim(),
          rating,
          title: title.trim() || null,
        })
        // 快取直寫：回到書本頁立刻看到新版
        const saved = { ...existingReview, content: content.trim(), rating, title: title.trim() || null }
        writeCache(`wr_rev_${profile.id}_${bookId}`, saved)
        const rc = readCache<Review[]>(`book_${book.title}_reviews`)
        if (rc) {
          writeCache(`book_${book.title}_reviews`, rc.map((r) => (r.id === saved.id ? { ...r, content: saved.content, rating } : r)))
        }
        toast.success("心得已更新")
      } else {
        const created = await selfize.create<Review>("reviews", {
          user_id: profile.id,
          book_id: book.id,
          book_title: book.title,
          book_author: book.author || "",
          content: content.trim(),
          rating,
          title: title.trim() || null,
        })
        // 新書評自動進動態 feed（失敗不影響發表）
        try {
          await selfize.create("posts", {
            user_id: profile.id,
            text: content.trim(),
            book_id: book.id,
            book_title: book.title,
            book_cover: book.cover_url || null,
            kind: "review",
            ref_id: created.id,
            likes: [],
          })
        } catch {}
        writeCache(`wr_rev_${profile.id}_${bookId}`, created)
        toast.success("心得已發表")
      }
      navigate(`/book/${encodeURIComponent(book.title)}`)
    } catch (error) {
      toast.error("儲存失敗，請重試")
    } finally {
      setSubmitting(false)
    }
  }

  if (isReady && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 px-4">
          <LogIn className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg text-muted-foreground">請先登入以寫心得</p>
          <Button onClick={() => login()}>登入 / 註冊</Button>
        </div>
        <Navigation />
      </div>
    )
  }

  // 只有「第一次進來且沒有快取」才看整頁骨架
  if (loading && !book) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="h-60 bg-muted animate-pulse rounded-xl mt-16" />
        </div>
        <Navigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/my")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold flex-1 truncate">
              {existingReview ? "編輯心得" : "寫心得"}
            </h1>
            <Button onClick={handleSubmit} disabled={submitting || !content.trim()}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {existingReview ? "更新" : "發表"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {book && (
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="font-medium">{book.title}</p>
            {book.author && (
              <p className="text-sm text-muted-foreground">{book.author}</p>
            )}
          </div>
        )}

        {/* 標題（選填） */}
        <div className="space-y-2">
          <label className="text-sm font-medium">標題</label>
          <input
            value={title}
            onChange={(e) => {
              dirtyRef.current = true
              setTitle(e.target.value)
            }}
            placeholder="幫這篇心得取個標題（留空就用書名）"
            className="w-full h-11 text-lg font-bold rounded-md border border-input bg-background px-3"
          />
        </div>

        {/* 推／倒讚 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">這本書：</span>
          <Button
            type="button"
            size="sm"
            variant={rating === "up" ? "default" : "outline"}
            onClick={() => setRating(rating === "up" ? null : "up")}
            className={rating === "up" ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <ThumbsUp className="h-4 w-4 mr-1" />推
          </Button>
          <Button
            type="button"
            size="sm"
            variant={rating === "down" ? "default" : "outline"}
            onClick={() => setRating(rating === "down" ? null : "down")}
            className={rating === "down" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            <ThumbsDown className="h-4 w-4 mr-1" />倒讚
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-sm font-medium">讀後心得</label>
            <div className="flex items-center gap-1 flex-wrap justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDraft}
                disabled={drafting}
              >
                {drafting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                {drafting ? "彙整中…" : "從我的紀錄生成草稿"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditorMode(editorMode === "rich" ? "md" : "rich")}
              >
                {editorMode === "rich" ? <Code className="h-4 w-4 mr-1" /> : <Edit className="h-4 w-4 mr-1" />}
                {editorMode === "rich" ? "Markdown" : "編輯器"}
              </Button>
              {editorMode === "md" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewing(!previewing)}
                  className="lg:hidden"
                >
                  {previewing ? <Edit className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {previewing ? "編輯" : "預覽"}
                </Button>
              )}
            </div>
          </div>
          {editorMode === "rich" ? (
            /* Medium 式所見即所得：直接在排好版的文章上編輯 */
            <RichEditor
              value={content}
              onChange={(md) => {
                dirtyRef.current = true
                setContent(md)
              }}
              placeholder="寫下你對這本書的感想…選取文字可以加粗、引用"
            />
          ) : (
            /* Markdown 模式：桌面左編輯右即時預覽；手機切換 */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Textarea
                value={content}
                onChange={(e) => {
                  dirtyRef.current = true
                  setContent(e.target.value)
                }}
                placeholder="寫下你對這本書的感想...&#10;&#10;支援 Markdown 格式：**粗體**、*斜體*、## 標題、- 列表"
                className={`min-h-[320px] resize-y font-mono text-sm ${previewing ? "hidden lg:block" : ""}`}
              />
              <div className={`prose-review min-h-[320px] p-4 rounded-md border bg-card overflow-y-auto ${previewing ? "" : "hidden lg:block"}`}>
                {content.trim() ? (
                  <ReactMarkdown rehypePlugins={reviewRehypePlugins}>{mdPreserveBreaks(content)}</ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground italic">右邊會即時顯示排版後的樣子</p>
                )}
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {content.length} 字 · 支援 Markdown
          </p>
        </div>

      </main>

      <Navigation />
    </div>
  )
}

export default WriteReview
