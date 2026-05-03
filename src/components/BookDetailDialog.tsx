import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { BookMarked } from 'lucide-react'
import type { Book } from '@/integrations/supabase/types'

interface BookDetailDialogProps {
  book: Book | null
  onClose: () => void
  actions?: React.ReactNode
}

const BookDetailDialog = ({ book, onClose, actions }: BookDetailDialogProps) => {
  if (!book) return null

  return (
    <Dialog open={!!book} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{book.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4">
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={book.title}
                className="w-24 h-36 object-cover rounded-lg border shadow-sm"
              />
            ) : (
              <div className="w-24 h-36 bg-muted rounded-lg flex items-center justify-center border">
                <BookMarked className="h-8 w-8 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 space-y-2">
              <p className="text-muted-foreground">{book.author}</p>
              <Badge variant={book.status === 'available' ? 'default' : 'secondary'}>
                {book.status === 'available' ? '可換' : '換出中'}
              </Badge>

              {book.tags && book.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {book.tags.map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {actions && <div className="pt-2 border-t">{actions}</div>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BookDetailDialog
