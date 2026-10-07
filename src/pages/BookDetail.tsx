import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
  selfize,
  type BookWithOwner,
  type Book,
  type ReviewExpanded,
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
} from "lucide-react"
import PublicRecordCard, { type PublicRecord } from "@/components/PublicRecordCard"
import { readCache, writeCache } from "@/lib/page-cache"
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
            <h1 className="text-xl font-bold truncate">{decodedTitle}</h1>
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
              <h3 className="text-lg font-semibold">心得</h3>
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
                        <div className="prose-review text-sm">
                          <ReactMarkdown>{review.content.replace(/\n/g, "  \n")}</ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
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
                            <div className="flex gap-1.5">
                              <Button size="sm" variant="outline" onClick={() => navigate(`/my/edit/${book.id}`)}>
                                <Edit className="h-3 w-3 mr-1" />編輯
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => navigate(`/my/review/${book.id}`)}>
                                <FileText className="h-3 w-3 mr-1" />寫心得
                              </Button>
                            </div>
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
