import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { selfize, type SwapRequestExpanded } from '@/lib/selfize'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Navigation from '@/components/Navigation'
import ContactReveal from '@/components/ContactReveal'
import SwapPhotoUpload from '@/components/SwapPhotoUpload'
import SwapCompletedCard from '@/components/SwapCompletedCard'
import { useAuth } from '@/hooks/use-auth'
import { useProfile } from '@/hooks/use-profile'
import { useSwapRequests } from '@/hooks/use-swap-requests'
import { ArrowLeft, ArrowLeftRight, Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const SwapDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, isReady, login } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const { acceptRequest, rejectRequest, cancelRequest, uploadPhoto } = useSwapRequests(profile?.id)
  const [request, setRequest] = useState<SwapRequestExpanded | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!id || !profile) return
    fetchRequest()
  }, [id, profile])

  const fetchRequest = async () => {
    if (!id) return
    try {
      const data = await selfize.get<SwapRequestExpanded>('swap_requests', id, {
        expand: 'requester_id,requester_book_id,owner_id,owner_book_id',
      })
      setRequest(data)
    } catch (error) {
      toast.error('找不到此換書請求')
      navigate('/swaps/inbox')
    } finally {
      setLoading(false)
    }
  }

  const role = request?.owner_id === profile?.id ? 'owner' : 'requester'

  const handleAccept = async () => {
    if (!request) return
    setActionLoading(true)
    try {
      await acceptRequest(request.id)
      await fetchRequest()
      toast.success('已接受換書請求！')
    } catch (error) {
      toast.error('操作失敗')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!request) return
    setActionLoading(true)
    try {
      await rejectRequest(request.id)
      await fetchRequest()
      toast.success('已拒絕')
    } catch (error) {
      toast.error('操作失敗')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!request) return
    setActionLoading(true)
    try {
      await cancelRequest(request.id)
      toast.success('已取消')
      navigate('/swaps/inbox')
    } catch (error) {
      toast.error('操作失敗')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUploadPhoto = async (file: File) => {
    if (!request) return
    try {
      await uploadPhoto(request.id, file, role)
      await fetchRequest()
      toast.success('照片已上傳')
    } catch (error) {
      toast.error('上傳失敗')
    }
  }

  if (!isReady || profileLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="h-60 bg-muted animate-pulse rounded-xl mt-16" />
        </div>
        <Navigation />
      </div>
    )
  }

  if (!isAuthenticated) {
    login()
    return null
  }

  if (!request) return null

  const otherProfile = role === 'owner' ? request.requester_id_expanded : request.owner_id_expanded
  const myBook = role === 'owner' ? request.owner_book_id_expanded : request.requester_book_id_expanded
  const otherBook = role === 'owner' ? request.requester_book_id_expanded : request.owner_book_id_expanded

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/swaps/inbox')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">換書詳情</h1>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-4">
        {/* Completed state */}
        {request.status === 'completed' && (
          <SwapCompletedCard request={request} />
        )}

        {/* Books exchange info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              交換內容
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">
                  {role === 'owner' ? '對方出' : '我出'}
                </p>
                <p className="font-medium text-sm">{otherBook?.title}</p>
                <p className="text-xs text-muted-foreground">{otherBook?.author}</p>
              </div>
              <ArrowLeftRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">
                  {role === 'owner' ? '我的書' : '想換'}
                </p>
                <p className="font-medium text-sm">{myBook?.title}</p>
                <p className="text-xs text-muted-foreground">{myBook?.author}</p>
              </div>
            </div>

            {request.message && (
              <div className="p-3 rounded-lg bg-muted/30 border">
                <p className="text-xs text-muted-foreground mb-1">留言</p>
                <p className="text-sm">{request.message}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions for pending state */}
        {request.status === 'pending' && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                等待回應
              </Badge>
              {role === 'owner' ? (
                <div className="flex gap-2">
                  <Button onClick={handleAccept} disabled={actionLoading} className="flex-1">
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    接受
                  </Button>
                  <Button variant="outline" onClick={handleReject} disabled={actionLoading} className="flex-1">
                    <X className="mr-2 h-4 w-4" />
                    拒絕
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={handleCancel} disabled={actionLoading}>
                  取消請求
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Accepted state: show contact + photo upload */}
        {request.status === 'accepted' && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">對方的聯絡方式</CardTitle>
              </CardHeader>
              <CardContent>
                {otherProfile ? (
                  <ContactReveal profile={otherProfile} />
                ) : (
                  <p className="text-sm text-muted-foreground">載入中...</p>
                )}
                <p className="text-xs text-muted-foreground mt-3">
                  請聯繫對方約好見面時間和地點，交換後各自拍照上傳即完成！
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">上傳交換照片</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">我的照片</p>
                  <SwapPhotoUpload
                    existingUrl={role === 'owner' ? request.owner_photo_url : request.requester_photo_url}
                    onUpload={handleUploadPhoto}
                    label="拍照上傳"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">對方的照片</p>
                  {(role === 'owner' ? request.requester_photo_url : request.owner_photo_url) ? (
                    <img
                      src={(role === 'owner' ? request.requester_photo_url : request.owner_photo_url)!}
                      alt="對方照片"
                      className="w-full max-w-xs rounded-lg border"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">等待對方上傳...</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Rejected/Cancelled */}
        {(request.status === 'rejected' || request.status === 'cancelled') && (
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground">
              <p>{request.status === 'rejected' ? '此請求已被拒絕' : '此請求已取消'}</p>
            </CardContent>
          </Card>
        )}
      </main>

      <Navigation />
    </div>
  )
}

export default SwapDetail
