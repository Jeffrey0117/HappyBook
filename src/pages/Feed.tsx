import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { selfize, type PostExpanded, type Book } from "@/lib/selfize"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Navigation from "@/components/Navigation"
import { HL_CATEGORIES } from "@/components/SourceHighlighter"
import { readCache, writeCache } from "@/lib/page-cache"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import { useMyBooks } from "@/hooks/use-my-books"
import { Heart, User, BookOpen, Loader2, PenLine, NotebookPen } from "lucide-react"
import { toast } from "sonner"

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr.replace(" ", "T") + "Z").getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "剛剛"
  if (min < 60) return `${min} 分鐘前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小時前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  return new Date(dateStr).toLocaleDateString("zh-TW", { month: "short", day: "numeric" })
}

const KIND_LABEL: Record<string, string> = {
  review: "發表了書評",
  record: "公開了閱讀筆記",
}

const Feed = () => {
  const { isAuthenticated, login } = useAuth()
  const { profile } = useProfile()
  const { books: myBooks } = useMyBooks(profile?.id)

  const [posts, setPosts] = useState<PostExpanded[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [bookId, setBookId] = useState("")
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    const cached = readCache<PostExpanded[]>("feed_posts")
    if (cached) {
      setPosts(cached)
      setLoading(false)
    }
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const { items } = await selfize.list<PostExpanded>("posts", {
        sort: "-created_at",
        perPage: "100",
        expand: "user_id",
      })
      setPosts(items)
      writeCache("feed_posts", items)
    } catch (error) {
      // 快取撐著
    } finally {
      setLoading(false)
    }
  }

  const handlePost = async () => {
    if (!profile || !text.trim()) return
    setPosting(true)
    try {
      const book = myBooks.find((b: Book) => b.id === bookId)
      await selfize.create("posts", {
        user_id: profile.id,
        text: text.trim(),
        book_id: book?.id || null,
        book_title: book?.title || null,
        book_cover: book?.cover_url || null,
        kind: "post",
        likes: [],
      })
      setText("")
      setBookId("")
      toast.success("發布了！")
      fetchPosts()
    } catch (error) {
      toast.error("發布失敗，再試一次")
    } finally {
      setPosting(false)
    }
  }

  const toggleLike = async (post: PostExpanded) => {
    if (!profile) {
      login()
      return
    }
    const likes = post.likes || []
    const liked = likes.includes(profile.id)
    const next = liked ? likes.filter((id) => id !== profile.id) : [...likes, profile.id]
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, likes: next } : p)))
    try {
      await selfize.update("posts", post.id, { likes: next })
    } catch (error) {
      // 失敗就讓下次 fetch 校正
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-sm mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold mb-4">動態</h1>

        {/* 發文框 */}
        {isAuthenticated && profile ? (
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={2}
                  placeholder="在讀什麼？聊聊吧"
                  className="resize-none border-0 bg-transparent px-0 focus-visible:ring-0 text-[15px]"
                />
                <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                  <select
                    value={bookId}
                    onChange={(e) => setBookId(e.target.value)}
                    className="h-8 text-sm rounded-md border border-input bg-background px-2 max-w-[60%]"
                  >
                    <option value="">不掛書</option>
                    {myBooks.map((b: Book) => (
                      <option key={b.id} value={b.id}>📖 {b.title}</option>
                    ))}
                  </select>
                  <Button size="sm" onClick={handlePost} disabled={posting || !text.trim()}>
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "發布"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-4 mb-6 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">登入後加入聊書</p>
            <Button size="sm" onClick={() => login()}>登入</Button>
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center pt-12 text-muted-foreground">
            <PenLine className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>還沒有動態，發第一則吧。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const author = post.user_id_expanded
              const likes = post.likes || []
              const liked = !!profile && likes.includes(profile.id)
              return (
                <article key={post.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Link to={`/user/${post.user_id}`} className="shrink-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={author?.avatar_url || undefined} />
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/user/${post.user_id}`} className="font-medium text-sm hover:text-primary truncate block">
                        {author?.display_name || "讀者"}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {KIND_LABEL[post.kind] ? `${KIND_LABEL[post.kind]} · ` : ""}
                        {timeAgo(post.created_at)}
                      </p>
                    </div>
                    {post.kind !== "post" && (
                      <NotebookPen className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </div>

                  <p className="text-[15px] whitespace-pre-line leading-relaxed line-clamp-6">{post.text}</p>

                  {post.quote?.text && (
                    <blockquote className={`mt-2 text-sm rounded-md px-3 py-2 ${HL_CATEGORIES[post.quote.c || "y"]?.mark || "bg-muted"}`}>
                      「{post.quote.text}」
                    </blockquote>
                  )}

                  {post.book_title && (
                    <Link
                      to={`/book/${encodeURIComponent(post.book_title)}`}
                      className="mt-2 flex items-center gap-2 border border-border rounded-lg p-2 hover:bg-muted transition-colors"
                    >
                      {post.book_cover ? (
                        <img src={post.book_cover} alt={post.book_title} className="w-8 h-11 object-cover rounded shrink-0" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-muted-foreground shrink-0 mx-1.5" />
                      )}
                      <span className="text-sm font-medium truncate">《{post.book_title}》</span>
                    </Link>
                  )}

                  <div className="mt-2">
                    <button
                      onClick={() => toggleLike(post)}
                      className={`flex items-center gap-1 text-sm transition-colors ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
                    >
                      <Heart className={`w-4 h-4 ${liked ? "fill-red-500" : ""}`} />
                      {likes.length > 0 ? likes.length : ""}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
      <Navigation />
    </div>
  )
}

export default Feed
