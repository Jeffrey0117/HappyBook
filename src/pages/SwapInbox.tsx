import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import Navigation from '@/components/Navigation'
import SwapCard from '@/components/SwapCard'
import { useAuth } from '@/hooks/use-auth'
import { useProfile } from '@/hooks/use-profile'
import { useSwapRequests } from '@/hooks/use-swap-requests'
import { Inbox, Send, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'

const SwapInbox = () => {
  const { isAuthenticated, isReady, login } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const { incoming, outgoing, loading, acceptRequest, rejectRequest, cancelRequest } = useSwapRequests(profile?.id)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleAccept = async (id: string) => {
    setActionLoading(id)
    try {
      await acceptRequest(id)
      toast.success('已接受換書請求')
    } catch (error) {
      toast.error('操作失敗')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id: string) => {
    setActionLoading(id)
    try {
      await rejectRequest(id)
      toast.success('已拒絕')
    } catch (error) {
      toast.error('操作失敗')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (id: string) => {
    setActionLoading(id)
    try {
      await cancelRequest(id)
      toast.success('已取消')
    } catch (error) {
      toast.error('操作失敗')
    } finally {
      setActionLoading(null)
    }
  }

  if (!isReady || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="h-40 bg-muted animate-pulse rounded-xl mt-16" />
        </div>
        <Navigation />
      </div>
    )
  }

  if (!isAuthenticated) {
    login()
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">換書</h1>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="incoming" className="flex-1">
              <Inbox className="h-4 w-4 mr-1" />
              收到的 ({incoming.length})
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="flex-1">
              <Send className="h-4 w-4 mr-1" />
              送出的 ({outgoing.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-3 mt-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : incoming.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <ArrowLeftRight className="h-16 w-16 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">還沒有收到換書請求</p>
              </div>
            ) : (
              incoming.map((request) => (
                <SwapCard
                  key={request.id}
                  request={request}
                  role="owner"
                  onAccept={actionLoading ? undefined : () => handleAccept(request.id)}
                  onReject={actionLoading ? undefined : () => handleReject(request.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-3 mt-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : outgoing.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <Send className="h-16 w-16 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">還沒有送出換書請求</p>
              </div>
            ) : (
              outgoing.map((request) => (
                <SwapCard
                  key={request.id}
                  request={request}
                  role="requester"
                  onCancel={actionLoading ? undefined : () => handleCancel(request.id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Navigation />
    </div>
  )
}

export default SwapInbox
