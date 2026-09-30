import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeftRight, Loader2, BookOpen } from 'lucide-react'
import type { Book, BookWithOwner } from '@/lib/selfize'

interface SwapRequestDialogProps {
  open: boolean
  onClose: () => void
  targetBook: BookWithOwner | null
  myBooks: Book[]
  onSubmit: (data: { requester_book_id: string; message?: string }) => Promise<void>
}

const SwapRequestDialog = ({ open, onClose, targetBook, myBooks, onSubmit }: SwapRequestDialogProps) => {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedBookId) return
    setSubmitting(true)
    try {
      await onSubmit({
        requester_book_id: selectedBookId,
        message: message.trim() || undefined,
      })
      setSelectedBookId(null)
      setMessage('')
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>發起換書請求</DialogTitle>
          <DialogDescription>
            選一本你的書來交換
          </DialogDescription>
        </DialogHeader>

        {targetBook && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground mb-1">你想要</p>
            <p className="font-medium">{targetBook.title}</p>
            <p className="text-sm text-muted-foreground">{targetBook.author}</p>
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-base font-medium">選擇你要出的書</Label>
          {myBooks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">你還沒有可交換的書</p>
            </div>
          ) : (
            <div className="grid gap-2 max-h-48 overflow-y-auto">
              {myBooks.map((book) => (
                <Card
                  key={book.id}
                  className={`cursor-pointer transition-all ${
                    selectedBookId === book.id
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedBookId(book.id)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    {book.cover_url ? (
                      <img src={book.cover_url} alt="" className="w-8 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-8 h-10 bg-muted rounded flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{book.title}</p>
                      <p className="text-xs text-muted-foreground">{book.author}</p>
                    </div>
                    {selectedBookId === book.id && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <ArrowLeftRight className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>留言給對方（選填）</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="嗨！我對這本書很感興趣..."
            className="min-h-[80px]"
          />
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!selectedBookId || submitting}
        >
          {submitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />送出中...</>
          ) : (
            <><ArrowLeftRight className="mr-2 h-4 w-4" />送出換書請求</>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export default SwapRequestDialog
