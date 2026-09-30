import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { selfize, type ReviewExpanded } from "@/lib/selfize"
import { Card, CardContent } from "@/components/ui/card"
import Navigation from "@/components/Navigation"
import { BookOpen, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import ReactMarkdown from "react-markdown"

const Reviews = () => {
  const [reviews, setReviews] = useState<ReviewExpanded[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      const { items } = await selfize.list<ReviewExpanded>("reviews", {
        sort: "-created_at",
        limit: "50",
        expand: "user_id",
      })
      setReviews(items)
    } catch (error) {
      // silently fail
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
          <h1 className="text-2xl font-bold">讀書心得</h1>
          <p className="text-sm text-muted-foreground mt-1">
            來自社群的閱讀分享
          </p>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <BookOpen className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <p className="text-lg text-muted-foreground">還沒有人寫心得</p>
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
                    <ReactMarkdown>{review.content}</ReactMarkdown>
                  </div>

                  {review.user_id_expanded && (
                    <Link
                      to={`/reviews/user/${review.user_id}`}
                      className="flex items-center gap-2 pt-2 border-t"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={review.user_id_expanded.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {review.user_id_expanded.display_name}
                      </span>
                    </Link>
                  )}
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

export default Reviews
