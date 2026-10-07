import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { selfize, type ReviewExpanded, type Profile } from "@/lib/selfize"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import { ArrowLeft, BookOpen, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import ReactMarkdown from "react-markdown"

const UserReviews = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [reviews, setReviews] = useState<ReviewExpanded[]>([])
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      fetchData()
    }
  }, [userId])

  const fetchData = async () => {
    if (!userId) return
    try {
      const [reviewsResult, profileResult] = await Promise.all([
        selfize.list<ReviewExpanded>("reviews", {
          user_id: userId,
          sort: "-created_at",
          limit: "50",
        }),
        selfize.get<Profile>("profiles", userId),
      ])
      setReviews(reviewsResult.items)
      setUserProfile(profileResult)
    } catch (error) {
      // silently fail - profile might not load
      try {
        const { items } = await selfize.list<ReviewExpanded>("reviews", {
          user_id: userId!,
          sort: "-created_at",
          limit: "50",
        })
        setReviews(items)
      } catch {
        // silently fail
      }
    } finally {
      setLoading(false)
    }
  }

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
            <Button variant="ghost" size="sm" onClick={() => navigate("/reviews")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              {userProfile && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={userProfile.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                <h1 className="text-xl font-bold">
                  {userProfile?.display_name || "使用者"}的讀書心得
                </h1>
                <p className="text-xs text-muted-foreground">
                  {reviews.length} 篇心得
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <p className="text-lg text-muted-foreground">還沒有寫任何心得</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{review.book_title}</p>
                      {review.book_author && (
                        <p className="text-sm text-muted-foreground">
                          {review.book_author}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(review.created_at)}
                    </span>
                  </div>

                  <div className="prose-review text-sm">
                    <ReactMarkdown>{review.content.replace(/\n/g, "  \n")}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Navigation />
    </div>
  )
}

export default UserReviews
