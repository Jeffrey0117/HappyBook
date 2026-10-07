import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
  selfize,
  type BookWithOwner,
  type Book,
  type ReviewExpanded,
  type ReviewCommentExpanded,
} from "@/lib/selfize"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Navigation from "@/components/Navigation"
import SwapRequestDialog from "@/components/SwapRequestDialog"
import {
  ArrowLeft,
  ArrowLeftRight,
  BookMarked,
  Edit,
  FileText,
  User,
  Heart,
  MessageCircle,
  Loader2,
} from "lucide-react"
import PublicRecordCard, { type PublicRecord } from "@/components/PublicRecordCard"
import UserMenu from "@/components/UserMenu"
import { readCache, writeCache } from "@/lib/page-cache"
import { mdPreserveBreaks, reviewRehypePlugins } from "@/lib/markdown"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import { useMyBooks } from "@/hooks/use-my-books"
import { useOnboarding } from "@/hooks/use-onboarding"
import { useSwapRequests } from "@/hooks/use-swap-requests"
import { getLevelInfo } from "@/lib/game-config"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"

const BookDetail = () => {
  const { title } = useParams<{ title: string }>()
  const navigate = useNavigate()
  const decodedTitle = title ? decodeURIComponent(title) : ""

  const { login, isAuthenticated } = useAuth()
  const { profile } = useProfile()
  const { availableBooks: myAvailableBooks, books: myAllBooks } = useMyBooks(profile?.id)
  const { isOnboarded } = useOnboarding(profile, myAllBooks)
  const { createRequest } = useSwapRequests(profile?.id)

  const [books, setBooks] = useState<BookWithOwner[]>([])
  const [publicNotes, setPublicNotes] = useState<PublicRecord[]>([])
  const [reviews, setReviews] = useState<ReviewExpanded[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [notesLoading, setNotesLoading] = useState(true)
  const [swapTarget, setSwapTarget] = useState<BookWithOwner | null>(null)
  const [allBooks, setAllBooks] = useState<Book[]>([])
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, ReviewCommentExpanded[]>>({})
  const [commentText, setCommentText] = useState("")
  const [sendingComment, setSendingComment] = useState(false)

  useEffect(() => {
    if (decodedTitle) {
      // 快取先上（秒出整頁），背景再抓最新
      const cb = readCache<BookWithOwner[]>(`book_${decodedTitle}_books`)
      if (cb) {
        setBooks(cb)
        setLoading(false)
      }
      const cr = readCache<ReviewExpanded[]>(`book_${decodedTitle}_reviews`)
      if (cr) {
        setReviews(cr)
        setReviewsLoading(false)
      }
      const cn = readCache<PublicRecord[]>(`book_${decodedTitle}_notes`)
      if (cn) {
        setPublicNotes(cn)
        setNotesLoading(false)
      }
      fetchBooks()
      fetchReviews()
      // 「接著讀」推薦用的全站書單（快取優先）
      const cab = readCache<Book[]>("browse_books")
      if (cab) setAllBooks(cab)
      else {
        selfize
          .list<Book>("books", { status: "available", sort: "-created_at", limit: "500" })
          .then(({ items }) => setAllBooks(items))
          .catch(() => {})
      }
    }
  }, [decodedTitle])

  const fetchBooks = async () => {
    try {
      const { items } = await selfize.list<BookWithOwner>("books", {
        status: "available",
        sort: "-created_at",
        limit: "500",
        expand: "owner_id",
      })

      const matched = items.filter(
        (b) => b.title.toLowerCase().trim() === decodedTitle.toLowerCase().trim()
      )
      setBooks(matched)
      writeCache(`book_${decodedTitle}_books`, matched)
      fetchPublicNotes(matched.map((b) => b.id))
    } catch (error) {
      toast.error("無法載入書籍資料")
    } finally {
      setLoading(false)
    }
  }

  const fetchPublicNotes = async (bookIds: string[]) => {
    if (bookIds.length === 0) {
      setNotesLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/public/records?book=${bookIds.join(",")}`)
      const data = await res.json()
      if (res.ok) {
        setPublicNotes(data.records || [])
        writeCache(`book_${decodedTitle}_notes`, data.records || [])
      }
    } catch (error) {
      // 公開筆記載入失敗不影響頁面其他部分
    } finally {
      setNotesLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const { items } = await selfize.list<ReviewExpanded>("reviews", {
        book_title: decodedTitle,
        sort: "-created_at",
        limit: "50",
        expand: "user_id",
      })
      setReviews(items)
      writeCache(`book_${decodedTitle}_reviews`, items)
    } catch (error) {
      // silently fail
    } finally {
      setReviewsLoading(false)
    }
  }

  const toggleReviewLike = async (review: ReviewExpanded) => {
    if (!profile) {
      login()
      return
    }
    const likes = review.likes || []
    const liked = likes.includes(profile.id)
    const next = liked ? likes.filter((id) => id !== profile.id) : [...likes, profile.id]
    setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, likes: next } : r)))
    try {
      await selfize.update("reviews", review.id, { likes: next })
    } catch (error) {
      // 失敗讓下次 fetch 校正
    }
  }

  const toggleComments = async (review: ReviewExpanded) => {
    if (openComments === review.id) {
      setOpenComments(null)
      return
    }
    setOpenComments(review.id)
    setCommentText("")
    if (!comments[review.id]) {
      try {
        const { items } = await selfize.list<ReviewCommentExpanded>("review_comments", {
          review_id: review.id,
          sort: "created_at",
          limit: "100",
          expand: "user_id",
        })
        setComments((prev) => ({ ...prev, [review.id]: items }))
      } catch (error) {
        setComments((prev) => ({ ...prev, [review.id]: [] }))
      }
    }
  }

  const submitComment = async (review: ReviewExpanded) => {
    if (!profile || !commentText.trim()) return
    setSendingComment(true)
    try {
      const created = await selfize.create<ReviewCommentExpanded>("review_comments", {
        review_id: review.id,
        user_id: profile.id,
        text: commentText.trim(),
      })
      setComments((prev) => ({
        ...prev,
        [review.id]: [...(prev[review.id] || []), { ...created, user_id_expanded: profile }],
      }))
      setCommentText("")
    } catch (error) {
      toast.error("留言失敗，再試一次")
    } finally {
      setSendingComment(false)
    }
  }

  const handleSwapRequest = (book: BookWithOwner) => {
    if (!isAuthenticated) {
      login()
      return
    }
    if (!isOnboarded) {
      toast.error("請先到書架完成個人設定")
      return
    }
    if (myAvailableBooks.length === 0) {
      toast.error("請先上架至少一本書")
      return
    }
    setSwapTarget(book)
  }

  const handleSubmitRequest = async (data: {
    requester_book_id: string
    message?: string
  }) => {
    if (!profile || !swapTarget) return
    try {
      await createRequest({
        requester_id: profile.id,
        requester_book_id: data.requester_book_id,
        owner_id: swapTarget.owner_id,
        owner_book_id: swapTarget.id,
        message: data.message,
      })
      toast.success("換書請求已送出！")
    } catch (error) {
      toast.error("送出失敗，請重試")
      throw error
    }
  }

  const coverUrl = books.find((b) => b.cover_url)?.cover_url || null
  const author = books.find((b) => b.author)?.author || null

  // 接著讀：跟這本書共享標籤的其他書
  const currentTags = new Set(books.flatMap((b) => b.tags || []))
  const relatedMap = new Map<string, Book>()
  for (const b of allBooks) {
    if (b.title.toLowerCase().trim() === decodedTitle.toLowerCase().trim()) continue
    if (!(b.tags || []).some((t) => currentTags.has(t))) continue
    const key = b.title.trim()
    const existing = relatedMap.get(key)
    if (!existing || (!existing.cover_url && b.cover_url)) relatedMap.set(key, b)
  }
  const related = [...relatedMap.values()].slice(0, 6)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/browse")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold truncate flex-1">{decodedTitle}</h1>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {loading ? (
          /* 骨架跟實際版型同構，載入完成不跳版 */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4 order-last lg:order-none">
              <div className="h-44 bg-muted animate-pulse rounded-xl" />
              <div className="h-64 bg-muted animate-pulse rounded-xl" />
            </div>
            <aside className="space-y-4">
              <div className="h-72 bg-muted animate-pulse rounded-xl" />
              <div className="h-40 bg-muted animate-pulse rounded-xl" />
            </aside>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左大欄：讀者筆記＋心得（手機時排在書籍資訊後面） */}
            <div className="lg:col-span-2 space-y-8 order-last lg:order-none">
            {/* Public reading notes section */}
            {notesLoading && publicNotes.length === 0 ? (
              <div className="h-16 bg-muted animate-pulse rounded-xl" />
            ) : null}
            {publicNotes.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-lg font-semibold">讀者筆記</h3>
                <div className="space-y-4">
                  {publicNotes.map((rec) => {
                    const sourceBook = books.find((b) => b.id === rec.book_id)
                    const ownerProfile = sourceBook?.owner_id_expanded
                    return (
                      <Card key={rec.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-2">
                            <Link
                              to={sourceBook ? `/user/${sourceBook.owner_id}` : "#"}
                              className="flex items-center gap-2 min-w-0"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={ownerProfile?.avatar_url || undefined} />
                                <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium hover:text-primary transition-colors truncate">
                                {ownerProfile?.display_name || "讀者"}
                              </span>
                            </Link>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {rec.chapter}{rec.pages ? ` p.${rec.pages}` : ""}
                            </span>
                          </div>
                          <PublicRecordCard record={rec} />
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Reviews section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">心得</h3>
                {profile && books.some((b) => b.owner_id === profile.id) && !reviews.some((r) => r.user_id === profile.id) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/my/review/${books.find((b) => b.owner_id === profile.id)!.id}`)}
                  >
                    <FileText className="h-3 w-3 mr-1" />寫心得
                  </Button>
                )}
              </div>
              {reviewsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-24 bg-muted animate-pulse rounded-xl"
                    />
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <p className="text-muted-foreground">還沒有人寫心得</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          {review.user_id_expanded && (
                            <Link
                              to={`/reviews/user/${review.user_id}`}
                              className="flex items-center gap-2"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage
                                  src={
                                    review.user_id_expanded.avatar_url ||
                                    undefined
                                  }
                                />
                                <AvatarFallback>
                                  <User className="h-3 w-3" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium hover:text-primary transition-colors">
                                {review.user_id_expanded.display_name}
                              </span>
                            </Link>
                          )}
                          <div className="flex items-center gap-2 shrink-0">
                            {review.rating === "up" && (
                              <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-400 px-2 py-0.5 rounded-full">
                                👍 推
                              </span>
                            )}
                            {review.rating === "down" && (
                              <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400 px-2 py-0.5 rounded-full">
                                👎 倒讚
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(review.created_at)}
                            </span>
                            {profile?.id === review.user_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/my/review/${review.book_id}`)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                編輯
                              </Button>
                            )}
                          </div>
                        </div>
                        {review.title && (
                          <h4 className="text-xl font-bold leading-snug">{review.title}</h4>
                        )}
                        <div className="prose-review">
                          <ReactMarkdown rehypePlugins={reviewRehypePlugins}>{mdPreserveBreaks(review.content)}</ReactMarkdown>
                        </div>

                        {/* 點讚＋留言 */}
                        <div className="flex items-center gap-4 pt-2 border-t border-border">
                          <button
                            onClick={() => toggleReviewLike(review)}
                            className={`flex items-center gap-1 text-sm transition-colors ${profile && (review.likes || []).includes(profile.id) ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
                          >
                            <Heart className={`w-4 h-4 ${profile && (review.likes || []).includes(profile.id) ? "fill-red-500" : ""}`} />
                            {(review.likes || []).length > 0 ? (review.likes || []).length : ""}
                          </button>
                          <button
                            onClick={() => toggleComments(review)}
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            留言{comments[review.id] ? `（${comments[review.id].length}）` : ""}
                          </button>
                        </div>

                        {openComments === review.id && (
                          <div className="border-l-2 border-border pl-3 space-y-3">
                            {(comments[review.id] || []).map((c) => (
                              <div key={c.id} className="flex gap-2">
                                <Link to={`/user/${c.user_id}`} className="shrink-0">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={c.user_id_expanded?.avatar_url || undefined} />
                                    <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                                  </Avatar>
                                </Link>
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground">
                                    <Link to={`/user/${c.user_id}`} className="font-medium text-foreground hover:text-primary">
                                      {c.user_id_expanded?.display_name || "讀者"}
                                    </Link>
                                    　{formatDate(c.created_at)}
                                  </p>
                                  <p className="text-sm whitespace-pre-line">{c.text}</p>
                                </div>
                              </div>
                            ))}
                            {isAuthenticated && profile ? (
                              <div className="flex gap-2 items-end">
                                <textarea
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  rows={1}
                                  placeholder="留言…"
                                  className="flex-1 text-sm rounded-md border border-input bg-background p-2 resize-none min-h-[36px]"
                                />
                                <Button size="sm" onClick={() => submitComment(review)} disabled={sendingComment || !commentText.trim()}>
                                  {sendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : "送出"}
                                </Button>
                              </div>
                            ) : (
                              <button onClick={() => login()} className="text-sm text-primary">登入後留言</button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* 接著讀：共享標籤的其他書 */}
            {related.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-lg font-semibold">接著讀</h3>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                  {related.map((b) => (
                    <Link
                      key={b.title}
                      to={`/book/${encodeURIComponent(b.title)}`}
                      className="shrink-0 w-24 group"
                      title={b.title}
                    >
                      {b.cover_url ? (
                        <img
                          src={b.cover_url}
                          alt={b.title}
                          className="w-full aspect-[2/3] object-cover rounded-lg border border-border shadow transition-transform group-hover:-translate-y-1"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] rounded-lg border border-border bg-muted flex items-center justify-center p-2">
                          <span className="text-xs text-muted-foreground text-center line-clamp-3">{b.title}</span>
                        </div>
                      )}
                      <p className="text-xs mt-1.5 line-clamp-2 group-hover:text-primary transition-colors">{b.title}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            </div>

            {/* 右側欄：書籍資訊＋擁有者 */}
            <aside className="space-y-4">
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={decodedTitle}
                    className="w-32 mx-auto rounded-lg shadow-md mb-3"
                  />
                ) : (
                  <div className="w-32 h-44 mx-auto bg-muted rounded-lg flex items-center justify-center mb-3">
                    <BookMarked className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <h2 className="text-lg font-bold leading-snug">{decodedTitle}</h2>
                {author && (
                  <p className="text-sm text-muted-foreground mt-1">{author}</p>
                )}
                <Badge variant="default" className="gap-1 mt-2">
                  {books.length} 人擁有
                </Badge>
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="font-semibold mb-3">擁有者</h3>
                {books.length === 0 ? (
                  <p className="text-muted-foreground text-sm">目前無人擁有此書</p>
                ) : (
                  <div className="space-y-3">
                    {books.map((book) => {
                      const ownerProfile = book.owner_id_expanded
                      const isOwnBook = book.owner_id === profile?.id
                      const bookCount = books.filter(
                        (b) => b.owner_id === book.owner_id
                      ).length
                      const xp = bookCount * 10
                      const levelInfo = getLevelInfo(xp)

                      return (
                        <div key={book.id} className="flex items-center gap-2 flex-wrap">
                          <Link to={`/user/${book.owner_id}`}>
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={ownerProfile?.avatar_url || undefined} />
                              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                            </Avatar>
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/user/${book.owner_id}`}
                              className="font-medium text-sm hover:text-primary transition-colors truncate block"
                            >
                              {ownerProfile?.display_name || "未知"}
                            </Link>
                            <p className="text-xs text-muted-foreground truncate">
                              Lv.{levelInfo.level} {levelInfo.title}
                              {book.condition ? `，書況：${book.condition}` : ""}
                            </p>
                          </div>
                          {isOwnBook ? (
                            <Button size="sm" variant="outline" onClick={() => navigate(`/my/edit/${book.id}`)}>
                              <Edit className="h-3 w-3 mr-1" />編輯
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleSwapRequest(book)}>
                              <ArrowLeftRight className="h-3 w-3 mr-1" />跟他換
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>

      <SwapRequestDialog
        open={!!swapTarget}
        onClose={() => setSwapTarget(null)}
        targetBook={swapTarget}
        myBooks={myAvailableBooks}
        onSubmit={handleSubmitRequest}
      />

      <Navigation />
    </div>
  )
}

export default BookDetail
