import { Link } from "react-router-dom"
import { BookOpen } from "lucide-react"
import { plainExcerpt } from "@/lib/markdown"
import type { Review } from "@/lib/selfize"

interface ReviewListItemProps {
  review: Review
  cover: string | null
  onEdit?: () => void
}

/** Medium 式心得文卡：封面膠囊 eyebrow → 大標題 → 摘要 → 日期列；右側大封面 */
const ReviewListItem = ({ review, cover, onEdit }: ReviewListItemProps) => {
  return (
    <Link to={`/book/${encodeURIComponent(review.book_title)}`} className="block group">
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          {/* 書籍膠囊（eyebrow） */}
          <div className="inline-flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2.5 py-1 mb-2 max-w-full">
            {cover ? (
              <img src={cover} alt="" className="w-4 h-6 object-cover rounded-sm shrink-0" />
            ) : (
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1" />
            )}
            <span className="text-xs font-medium text-muted-foreground truncate">{review.book_title}</span>
          </div>

          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-xl font-bold group-hover:text-primary transition-colors leading-snug">
              {review.title || `《${review.book_title}》`}
            </h3>
            {review.rating === "up" && (
              <span className="text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-400 px-2 py-0.5 rounded-full shrink-0">👍 推</span>
            )}
            {review.rating === "down" && (
              <span className="text-xs font-medium text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400 px-2 py-0.5 rounded-full shrink-0">👎 倒讚</span>
            )}
          </div>

          <p className="text-muted-foreground leading-relaxed line-clamp-3">{plainExcerpt(review.content)}</p>

          <p className="text-xs text-muted-foreground mt-2">
            {new Date(review.created_at).toLocaleDateString("zh-TW", { year: "numeric", month: "short", day: "numeric" })}
            　·　閱讀全文 →
            {onEdit && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  onEdit()
                }}
                className="ml-3 text-primary hover:underline"
              >
                編輯
              </button>
            )}
          </p>
        </div>

        {cover && (
          <img
            src={cover}
            alt={review.book_title}
            className="w-16 sm:w-20 aspect-[2/3] object-cover rounded-md border border-border shadow-sm shrink-0"
          />
        )}
      </div>
      <div className="border-b border-border mt-6" />
    </Link>
  )
}

export default ReviewListItem
