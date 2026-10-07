import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { selfize, type PostExpanded, type Book } from "@/lib/selfize"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Navigation from "@/components/Navigation"
import AppHeader from "@/components/AppHeader"
import { HL_CATEGORIES } from "@/components/SourceHighlighter"
import { readCache, writeCache } from "@/lib/page-cache"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import { Heart, User, BookOpen, Loader2, PenLine, NotebookPen, MessageCircle, Pencil, Trash2 } from "lucide-react"
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

interface BookOpt {
  id: string
  title: string
  cover: string | null
}

/** 把內文裡的 #書名 上色 */
function renderPostText(text: string, bookTitle: string | null) {
  if (!bookTitle || !text.includes(`#${bookTitle}`)) {
    return <>{text}</>
  }
  const parts = text.split(`#${bookTitle}`)
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="text-primary font-medium">#{bookTitle}</span>}
          {part}
        </span>
      ))}
    </>
  )
}

const Feed = () => {
  const { isAuthenticated, login } = useAuth()
  const { profile } = useProfile()

  const [posts, setPosts] = useState<PostExpanded[]>([])
  const [allBooks, setAllBooks] = useState<BookOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [posting, setPosting] = useState(false)
  const [openReplies, setOpenReplies] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replying, setReplying] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  useEffect(() => {
    const cached = readCache<PostExpanded[]>("feed_posts")
    if (cached) {
      setPosts(cached)
      setLoading(false)
    }
    fetchPosts()
    fetchBooks()
  }, [])

  const fetchPosts = async () => {
    try {
      const { items } = await selfize.list<PostExpanded>("posts", {
        sort: "-created_at",
        perPage: "200",
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

  const fetchBooks = async () => {
    try {
      const { items } = await selfize.list<Book>("books", { perPage: "500", sort: "-created_at" })
      const seen = new Map<string, BookOpt>()
      for (const b of items) {
        const key = b.title.trim()
        const existing = seen.get(key)
        if (!existing) {
          seen.set(key, { id: b.id, title: key, cover: b.cover_url })
        } else if (!existing.cover && b.cover_url) {
          seen.set(key, { ...existing, cover: b.cover_url })
        }
      }
      setAllBooks([...seen.values()])
    } catch (error) {
      // 建議清單缺了也能發（但發布時解析不到書會擋）
    }
  }

  // # 自動建議：抓文字結尾的 #片段
  const tagFrag = useMemo(() => {
    const m = /#([^#\s]*)$/.exec(text)
    return m ? m[1] : null
  }, [text])

  const suggestions = useMemo(() => {
    if (tagFrag === null) return []
    const q = tagFrag.toLowerCase()
    return allBooks.filter((b) => b.title.toLowerCase().includes(q)).slice(0, 5)
  }, [tagFrag, allBooks])

  const applySuggestion = (b: BookOpt) => {
    setText(text.replace(/#([^#\s]*)$/, `#${b.title} `))
  }

  // 解析 #書名 → 掛書（取最長符合的書名，支援含空格的書名）
  const resolveBook = (): BookOpt | null => {
    const lower = text.toLowerCase()
    const sorted = [...allBooks].sort((a, b) => b.title.length - a.title.length)
    for (const b of sorted) {
      if (lower.includes(`#${b.title.toLowerCase()}`)) return b
    }
    return null
  }

  const handlePost = async () => {
    if (!profile || !text.trim()) return
    const book = resolveBook()
    if (!book) {
      toast.error("用 #書名 標記這則在聊哪本書（打 # 會跳建議）")
      return
    }
    setPosting(true)
    try {
      await selfize.create("posts", {
        user_id: profile.id,
        text: text.trim(),
        book_id: book.id,
        book_title: book.title,
        book_cover: book.cover,
        kind: "post",
        likes: [],
      })
      setText("")
      toast.success("發布了！")
      fetchPosts()
    } catch (error) {
      toast.error("發布失敗，再試一次")
    } finally {
      setPosting(false)
    }
  }

  const handleReply = async (post: PostExpanded) => {
    if (!profile || !replyText.trim()) return
    setReplying(true)
    try {
      await selfize.create("posts", {
        user_id: profile.id,
        text: replyText.trim(),
        reply_to: post.id,
        kind: "post",
        likes: [],
      })
      setReplyText("")
      fetchPosts()
    } catch (error) {
      toast.error("回覆失敗，再試一次")
    } finally {
      setReplying(false)
    }
  }

  const handleDeletePost = async (post: PostExpanded) => {
    if (!confirm("刪除這則貼文？")) return
    try {
      await selfize.delete("posts", post.id)
      // 連回覆一起清，不留孤兒
      const replies = posts.filter((p) => p.reply_to === post.id)
      for (const r of replies) {
        try { await selfize.delete("posts", r.id) } catch {}
      }
      setPosts((prev) => prev.filter((p) => p.id !== post.id && p.reply_to !== post.id))
      toast.success("已刪除")
    } catch (error) {
      toast.error("刪除失敗，再試一次")
    }
  }

  const handleDeleteReply = async (reply: PostExpanded) => {
    if (!confirm("刪除這則回覆？")) return
    try {
      await selfize.delete("posts", reply.id)
      setPosts((prev) => prev.filter((p) => p.id !== reply.id))
    } catch (error) {
      toast.error("刪除失敗，再試一次")
    }
  }

  const handleSaveEdit = async (post: PostExpanded) => {
    if (!editText.trim()) return
    try {
      await selfize.update("posts", post.id, { text: editText.trim() })
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, text: editText.trim() } : p)))
      setEditingId(null)
      toast.success("已更新")
    } catch (error) {
      toast.error("儲存失敗，再試一次")
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

  const topPosts = posts.filter((p) => !p.reply_to)
  const repliesOf = (id: string) =>
    posts.filter((p) => p.reply_to === id).sort((a, b) => a.created_at.localeCompare(b.created_at))

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader>
        <h1 className="text-lg sm:text-xl font-bold truncate">動態</h1>
      </AppHeader>
      <div className="max-w-screen-sm mx-auto px-4 pt-6">

        {/* 發文框 */}
        {isAuthenticated && profile ? (
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 relative">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={2}
                  placeholder="在讀什麼？用 #書名 標記那本書"
                  className="resize-none border-0 bg-transparent px-0 focus-visible:ring-0 text-[15px]"
                />
                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                    {suggestions.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => applySuggestion(b)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        {b.cover ? (
                          <img src={b.cover} alt="" className="w-6 h-8 object-cover rounded shrink-0" />
                        ) : (
                          <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate">#{b.title}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-end mt-2">
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
        ) : topPosts.length === 0 ? (
          <div className="text-center pt-12 text-muted-foreground">
            <PenLine className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>還沒有動態，發第一則吧。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topPosts.map((post) => {
              const author = post.user_id_expanded
              const likes = post.likes || []
              const liked = !!profile && likes.includes(profile.id)
              const replies = repliesOf(post.id)
              const repliesOpen = openReplies === post.id
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
                    {profile?.id === post.user_id && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingId(post.id)
                            setEditText(post.text)
                          }}
                          className="p-1.5 text-muted-foreground hover:text-foreground"
                          title="編輯"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post)}
                          className="p-1.5 text-muted-foreground hover:text-destructive"
                          title="刪除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {editingId === post.id ? (
                    <div>
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        autoFocus
                        className="text-[15px]"
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>取消</Button>
                        <Button size="sm" onClick={() => handleSaveEdit(post)} disabled={!editText.trim()}>儲存</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[15px] whitespace-pre-line leading-relaxed line-clamp-6">
                      {renderPostText(post.text, post.book_title)}
                    </p>
                  )}

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

                  <div className="mt-2 flex items-center gap-4">
                    <button
                      onClick={() => toggleLike(post)}
                      className={`flex items-center gap-1 text-sm transition-colors ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
                    >
                      <Heart className={`w-4 h-4 ${liked ? "fill-red-500" : ""}`} />
                      {likes.length > 0 ? likes.length : ""}
                    </button>
                    <button
                      onClick={() => {
                        setOpenReplies(repliesOpen ? null : post.id)
                        setReplyText("")
                      }}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {replies.length > 0 ? replies.length : ""}
                    </button>
                  </div>

                  {/* 回覆區 */}
                  {repliesOpen && (
                    <div className="mt-3 border-l-2 border-border pl-3 space-y-3">
                      {replies.map((r) => {
                        const rAuthor = r.user_id_expanded
                        return (
                          <div key={r.id} className="flex gap-2">
                            <Link to={`/user/${r.user_id}`} className="shrink-0">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={rAuthor?.avatar_url || undefined} />
                                <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                              </Avatar>
                            </Link>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">
                                <Link to={`/user/${r.user_id}`} className="font-medium text-foreground hover:text-primary">
                                  {rAuthor?.display_name || "讀者"}
                                </Link>
                                　{timeAgo(r.created_at)}
                              </p>
                              <p className="text-sm whitespace-pre-line">{r.text}</p>
                            </div>
                            {profile?.id === r.user_id && (
                              <button
                                onClick={() => handleDeleteReply(r)}
                                className="p-1 text-muted-foreground hover:text-destructive shrink-0"
                                title="刪除回覆"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                      {isAuthenticated && profile ? (
                        <div className="flex gap-2 items-end">
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={1}
                            placeholder="回覆…"
                            className="resize-none text-sm min-h-[36px]"
                          />
                          <Button size="sm" onClick={() => handleReply(post)} disabled={replying || !replyText.trim()}>
                            {replying ? <Loader2 className="h-4 w-4 animate-spin" /> : "回覆"}
                          </Button>
                        </div>
                      ) : (
                        <button onClick={() => login()} className="text-sm text-primary">登入後回覆</button>
                      )}
                    </div>
                  )}
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
