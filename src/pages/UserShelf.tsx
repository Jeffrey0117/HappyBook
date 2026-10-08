import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { selfize, type Profile, type Book, type Review } from "@/lib/selfize"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import UserMenu from "@/components/UserMenu"
import NotificationBell from "@/components/NotificationBell"
import { notify } from "@/lib/notify"
import BookShelf from "@/components/BookShelf"
import ProfileCard from "@/components/ProfileCard"
import { ArrowLeft, BookOpen, NotebookPen, Instagram, UserPlus, UserCheck, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useGameStats } from "@/hooks/use-game-stats"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import { readCache, writeCache } from "@/lib/page-cache"
import ReviewListItem from "@/components/ReviewListItem"

const UserShelf = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({}) // book_id → 公開筆記數
  const [reviews, setReviews] = useState<Review[]>([])
  const { user, isReady, login } = useAuth()
  const { profile: myProfile } = useProfile()
  const [loading, setLoading] = useState(true)
  const stats = useGameStats(id)
  const isSelf = !!myProfile && myProfile.id === id
  const [followerTotal, setFollowerTotal] = useState(0)
  const [myFollowId, setMyFollowId] = useState<string | null>(null)
  const [followBusy, setFollowBusy] = useState(false)
  const [visitTotal, setVisitTotal] = useState(0)
  const [visitors, setVisitors] = useState<{ id: string; name: string; avatar: string | null }[]>([])

  // 追蹤狀態＋粉絲數
  useEffect(() => {
    if (!id) return
    selfize
      .list<{ id: string; follower_id: string }>("follows", { following_id: id, limit: "500" })
      .then(({ items, total }) => {
        setFollowerTotal(total)
        if (myProfile) {
          const mine = items.find((f) => f.follower_id === myProfile.id)
          setMyFollowId(mine?.id || null)
        }
      })
      .catch(() => {})
  }, [id, myProfile?.id])

  // 最近訪客＋人次（不等登入狀態，先顯示）
  const fetchVisits = async () => {
    if (!id) return
    try {
      const { items, total } = await selfize.list<{ visitor_id: string | null; visitor_name: string | null; visitor_avatar: string | null }>(
        "visits",
        { host_id: id, sort: "-created_at", limit: "50" }
      )
      setVisitTotal(total)
      const seen = new Set<string>()
      const vs: { id: string; name: string; avatar: string | null }[] = []
      for (const v of items) {
        if (!v.visitor_id || seen.has(v.visitor_id) || v.visitor_id === id) continue
        seen.add(v.visitor_id)
        vs.push({ id: v.visitor_id, name: v.visitor_name || "讀者", avatar: v.visitor_avatar })
        if (vs.length >= 8) break
      }
      setVisitors(vs)
    } catch {}
  }

  useEffect(() => {
    fetchVisits()
  }, [id])

  // 留下足跡：登入者記名、未登入記匿名人次；每個瀏覽器 session 一次、自己不算
  useEffect(() => {
    if (!id || !isReady) return
    if (user && !myProfile) return // 已登入但 profile 還沒到，等一下再記（記名用）
    const run = async () => {
      try {
        const key = `hb_visited_${id}`
        const isSelfVisit = !!myProfile && myProfile.id === id
        if (!sessionStorage.getItem(key) && !isSelfVisit) {
          sessionStorage.setItem(key, "1")
          await selfize.create("visits", {
            host_id: id,
            visitor_id: myProfile?.id || null,
            visitor_name: myProfile?.display_name || null,
            visitor_avatar: myProfile?.avatar_url || null,
          })
          fetchVisits()
        }
      } catch {}
    }
    run()
  }, [id, isReady, user?.id, myProfile?.id])

  const toggleFollow = async () => {
    if (!myProfile || !id || followBusy) return
    setFollowBusy(true)
    try {
      if (myFollowId) {
        await selfize.delete("follows", myFollowId)
        setMyFollowId(null)
        setFollowerTotal((n) => Math.max(0, n - 1))
      } else {
        const created = await selfize.create<{ id: string }>("follows", {
          follower_id: myProfile.id,
          following_id: id,
        })
        setMyFollowId(created.id)
        setFollowerTotal((n) => n + 1)
        notify({
          user_id: id,
          actor_id: myProfile.id,
          kind: "follow",
          link: `/user/${myProfile.id}`,
        })
      }
    } catch (error) {
      // 失敗就維持原狀
    } finally {
      setFollowBusy(false)
    }
  }

  useEffect(() => {
    // 快取先上（秒出），背景再抓最新
    const cached = readCache<{ profile: Profile; books: Book[]; noteCounts: Record<string, number>; reviews: Review[] }>(`usershelf_${id}`)
    if (cached) {
      setProfile(cached.profile)
      setBooks(cached.books)
      setNoteCounts(cached.noteCounts || {})
      setReviews(cached.reviews || [])
      setLoading(false)
    }
    fetchUserData()
  }, [id])

  const fetchUserData = async () => {
    try {
      // profile、書單、心得平行抓
      const [profileData, { items }, { items: reviewItems }] = await Promise.all([
        selfize.get<Profile>("profiles", id!),
        selfize.list<Book>("books", { owner_id: id!, sort: "-created_at", limit: "500" }),
        selfize.list<Review>("reviews", { user_id: id!, sort: "-created_at", limit: "50" }),
      ])
      setProfile(profileData)
      setBooks(items)
      setReviews(reviewItems)
      const counts = await fetchNoteCounts(profileData.user_id)
      writeCache(`usershelf_${id}`, { profile: profileData, books: items, noteCounts: counts, reviews: reviewItems })
    } catch (error) {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const fetchNoteCounts = async (userId: string): Promise<Record<string, number>> => {
    try {
      const res = await fetch(`/api/public/records?user=${encodeURIComponent(userId)}`)
      const data = await res.json()
      if (!res.ok) return {}
      const counts: Record<string, number> = {}
      for (const rec of data.records || []) {
        counts[rec.book_id] = (counts[rec.book_id] || 0) + 1
      }
      setNoteCounts(counts)
      return counts
    } catch (error) {
      // 筆記提示載入失敗不影響書架
      return {}
    }
  }

  const notedBooks = books.filter((b) => noteCounts[b.id])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg sm:text-xl font-bold truncate flex-1">
            {profile ? `${profile.display_name} 的書架` : "書架"}
          </h1>
          <NotificationBell />
          <UserMenu />
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* 新聞版型：左大欄＝書櫃，右側欄＝個人小面板 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-8">
            {loading ? (
              <div className="h-60 bg-muted animate-pulse rounded-xl" />
            ) : books.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-20 w-20 mx-auto text-muted-foreground/50" />
                <p className="text-xl font-medium text-muted-foreground mt-4">這個人還沒上架任何書</p>
              </div>
            ) : (
              <BookShelf books={books} />
            )}

            {/* Medium 風格心得文列表：左文右書封 */}
            {reviews.length > 0 && (
              <section>
                <h2 className="text-lg font-bold mb-4">心得</h2>
                <div className="space-y-6">
                  {reviews.map((review) => {
                    const cover = books.find((b) => b.id === review.book_id)?.cover_url || null
                    const isOwner = !!user && profile?.user_id === user.id
                    return (
                      <ReviewListItem
                        key={review.id}
                        review={review}
                        cover={cover}
                        onEdit={isOwner ? () => navigate(`/my/review/${review.book_id}`) : undefined}
                      />
                    )
                  })}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            {profile && (
              stats.loading
                ? <div className="h-56 bg-muted animate-pulse rounded-xl" />
                : <ProfileCard profile={profile} stats={stats} />
            )}

            {/* 追蹤：未登入也看得到，點了先登入 */}
            {!isSelf && (
              <Button
                className="w-full"
                variant={myFollowId ? "outline" : "default"}
                onClick={() => (myProfile ? toggleFollow() : login())}
                disabled={followBusy}
              >
                {myFollowId ? (
                  <><UserCheck className="w-4 h-4 mr-2" />追蹤中</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" />追蹤</>
                )}
              </Button>
            )}

            <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-around text-center">
              <div>
                <p className="text-xl font-bold">{followerTotal}</p>
                <p className="text-xs text-muted-foreground">粉絲</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-xl font-bold">{visitTotal}</p>
                <p className="text-xs text-muted-foreground">來訪人次</p>
              </div>
            </div>

            {/* 誰來我家（無名小站魂） */}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm font-medium mb-3">👀 誰來我家</p>
              {visitors.length === 0 ? (
                <p className="text-xs text-muted-foreground">還沒有訪客，把連結傳出去吧</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {visitors.map((v) => (
                    <Link key={v.id} to={`/user/${v.id}`} className="flex flex-col items-center w-14">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={v.avatar || undefined} />
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-muted-foreground truncate max-w-full mt-1">{v.name}</span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-4 text-center">
                <span className="inline-block bg-neutral-950 text-lime-400 font-mono text-lg tracking-[0.25em] pl-2 pr-0.5 py-1 rounded border border-lime-500/40">
                  {String(visitTotal).padStart(6, "0")}
                </span>
                <p className="text-[10px] text-muted-foreground mt-1.5">老派來訪計數器，向無名致敬</p>
              </div>
            </div>

            {profile?.ig && (
              <a
                href={`https://instagram.com/${profile.ig.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-card border border-border rounded-xl p-4 hover:bg-muted transition-colors"
              >
                <Instagram className="w-5 h-5 text-pink-500" />
                <span className="text-sm font-medium">@{profile.ig.replace(/^@/, "")}</span>
              </a>
            )}

            {notedBooks.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <NotebookPen className="w-4 h-4 text-primary" />
                  有閱讀筆記的書
                </p>
                <div className="flex flex-col gap-1.5">
                  {notedBooks.map((b) => (
                    <Link
                      key={b.id}
                      to={`/book/${encodeURIComponent(b.title)}`}
                      className="text-sm bg-muted hover:bg-primary/10 px-3 py-2 rounded-lg transition-colors leading-snug"
                    >
                      《{b.title}》
                      <span className="text-muted-foreground ml-1 whitespace-nowrap">{noteCounts[b.id]} 筆</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>

      <Navigation />
    </div>
  )
}

export default UserShelf
