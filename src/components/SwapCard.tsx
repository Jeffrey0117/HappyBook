import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeftRight, Check, X, Clock, Camera } from 'lucide-react'
import type { SwapRequestExpanded } from '@/lib/selfize'

interface SwapCardProps {
  request: SwapRequestExpanded
  role: 'owner' | 'requester'
  onAccept?: () => void
  onReject?: () => void
  onCancel?: () => void
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '等待回應', variant: 'outline' },
  accepted: { label: '已接受', variant: 'default' },
  completed: { label: '已完成', variant: 'secondary' },
  rejected: { label: '已拒絕', variant: 'destructive' },
  cancelled: { label: '已取消', variant: 'secondary' },
}

const SwapCard = ({ request, role, onAccept, onReject, onCancel }: SwapCardProps) => {
  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending
  const otherBook = role === 'owner' ? request.requester_book_id_expanded : request.owner_book_id_expanded
  const myBook = role === 'owner' ? request.owner_book_id_expanded : request.requester_book_id_expanded
  const otherPerson = role === 'owner' ? request.requester_id_expanded : request.owner_id_expanded

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <Link to={`/swaps/${request.id}`} className="block space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{otherPerson?.display_name || '使用者'}</span>
              <Badge variant={statusConfig.variant} className="text-xs">
                {statusConfig.label}
              </Badge>
            </div>
            {request.status === 'accepted' && (
              <Camera className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                {role === 'owner' ? '對方出' : '我出'}
              </p>
              <p className="font-medium line-clamp-1">{otherBook?.title || '未知書籍'}</p>
            </div>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                {role === 'owner' ? '換我的' : '想換'}
              </p>
              <p className="font-medium line-clamp-1">{myBook?.title || '未知書籍'}</p>
            </div>
          </div>

          {request.message && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              「{request.message}」
            </p>
          )}
        </Link>

        {request.status === 'pending' && (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            {role === 'owner' && onAccept && onReject && (
              <>
                <Button size="sm" onClick={onAccept} className="flex-1">
                  <Check className="h-3 w-3 mr-1" />
                  接受
                </Button>
                <Button size="sm" variant="outline" onClick={onReject} className="flex-1">
                  <X className="h-3 w-3 mr-1" />
                  拒絕
                </Button>
              </>
            )}
            {role === 'requester' && onCancel && (
              <Button size="sm" variant="outline" onClick={onCancel}>
                <Clock className="h-3 w-3 mr-1" />
                取消請求
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SwapCard
