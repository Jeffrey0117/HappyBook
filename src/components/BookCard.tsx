import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookMarked, User } from "lucide-react"

interface BookCardProps {
  book: {
    id: string
    title: string
    author: string
    tags: string[] | null
    status: string
    cover_url: string | null
    owner_id: string
  }
  ownerName?: string
  showOwner?: boolean
  actions?: React.ReactNode
}

const BookCard = ({ book, ownerName, showOwner = false, actions }: BookCardProps) => {
  return (
    <Card className="group hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors">
              {book.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{book.author}</p>
          </div>
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="w-12 h-16 object-cover rounded flex-shrink-0"
            />
          ) : (
            <BookMarked className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant={book.status === "available" ? "default" : "secondary"}>
            {book.status === "available" ? "可換" : "已換出"}
          </Badge>
          {showOwner && ownerName && (
            <Link
              to={`/user/${book.owner_id}`}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <User className="h-3 w-3" />
              {ownerName}
            </Link>
          )}
        </div>
        {book.tags && book.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {book.tags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs px-2 py-0.5">
                {tag}
              </Badge>
            ))}
            {book.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                +{book.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        {actions && <div className="pt-2 border-t">{actions}</div>}
      </CardContent>
    </Card>
  )
}

export default BookCard
