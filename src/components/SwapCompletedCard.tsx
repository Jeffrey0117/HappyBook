import type { SwapRequestExpanded } from '@/lib/selfize'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeftRight, CheckCircle } from 'lucide-react'

interface SwapCompletedCardProps {
  request: SwapRequestExpanded
}

const SwapCompletedCard = ({ request }: SwapCompletedCardProps) => {
  const requesterName = request.requester_id_expanded?.display_name || '換書人'
  const ownerName = request.owner_id_expanded?.display_name || '書主'
  const requesterBook = request.requester_book_id_expanded
  const ownerBook = request.owner_book_id_expanded

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-amber-700">
          <CheckCircle className="h-5 w-5" />
          <span className="font-bold text-sm">交換完成！</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 text-center">
            <p className="text-xs text-muted-foreground">{requesterName}</p>
            <p className="text-sm font-medium line-clamp-1">{requesterBook?.title}</p>
          </div>
          <ArrowLeftRight className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 text-center">
            <p className="text-xs text-muted-foreground">{ownerName}</p>
            <p className="text-sm font-medium line-clamp-1">{ownerBook?.title}</p>
          </div>
        </div>

        {(request.requester_photo_url || request.owner_photo_url) && (
          <div className="flex gap-2 pt-2">
            {request.requester_photo_url && (
              <img
                src={request.requester_photo_url}
                alt="交換照片"
                className="flex-1 h-24 object-cover rounded-lg"
              />
            )}
            {request.owner_photo_url && (
              <img
                src={request.owner_photo_url}
                alt="交換照片"
                className="flex-1 h-24 object-cover rounded-lg"
              />
            )}
          </div>
        )}

        {request.completed_at && (
          <p className="text-xs text-muted-foreground text-center">
            {new Date(request.completed_at).toLocaleDateString('zh-TW')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default SwapCompletedCard
