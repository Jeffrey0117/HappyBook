import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { selfize, type Book, type Review } from "@/lib/selfize"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import Navigation from "@/components/Navigation"
import { ArrowLeft, Loader2, Eye, Edit, LogIn, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import ReactMarkdown from "react-markdown"

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

  useEffect(() => {
    if (profile && bookId) {
      fetchData()
    }
  }, [profile, bookId])

  const fetchData = async () => {
    if (!bookId || !profile) return
    try {
      const bookData = await selfize.get<Book>("books", bookId)
      setBook(bookData)

      const { items } = await selfize.list<Review>("reviews", {
        user_id: profile.id,
        book_id: bookId,
        limit: "1",
      })
      if (items.length > 0) {
        setExistingReview(items[0])
        setContent(items[0].content)
      }
    } catch (error) {
      toast.error("無法載入書籍資料")
      navigate("/my")
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
      setPreviewing(false)
      toast.success("草稿好了——改成你自己的話再發表")
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
        })
        toast.success("心得已更新")
      } else {
        await selfize.create("reviews", {
          user_id: profile.id,
          book_id: book.id,
          book_title: book.title,
          book_author: book.author || "",
          content: content.trim(),
        })
        toast.success("心得已發表")
      }
      navigate("/my")
    } catch (error) {
      toast.error("儲存失敗，請重試")
    } finally {
      setSubmitting(false)
    }
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="h-60 bg-muted animate-pulse rounded-xl mt-16" />
        </div>
        <Navigation />
      </div>
    )
  }

  if (!isAuthenticated) {
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

  if (profileLoading || loading) {
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
            <h1 className="text-xl font-bold">
              {existingReview ? "編輯心得" : "寫心得"}
            </h1>
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">讀後心得</label>
            <div className="flex items-center gap-1">
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
                onClick={() => setPreviewing(!previewing)}
              >
                {previewing ? <Edit className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                {previewing ? "編輯" : "預覽"}
              </Button>
            </div>
          </div>
          {previewing ? (
            <div className="prose-review min-h-[200px] p-4 rounded-md border bg-card">
              {content.trim() ? (
                <ReactMarkdown>{content}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground italic">還沒有內容</p>
              )}
            </div>
          ) : (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="寫下你對這本書的感想...&#10;&#10;支援 Markdown 格式：**粗體**、*斜體*、## 標題、- 列表"
              className="min-h-[200px] resize-y font-mono text-sm"
            />
          )}
          <p className="text-xs text-muted-foreground">
            {content.length} 字 · 支援 Markdown
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting || !content.trim()}
          className="w-full"
          size="lg"
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {existingReview ? "更新心得" : "發表心得"}
        </Button>
      </main>

      <Navigation />
    </div>
  )
}

export default WriteReview
