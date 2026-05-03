import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import { ArrowRight, History, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"

interface SwapRecord {
  id: string
  swapped_at: string
  returned_at: string | null
  status: 'active' | 'returned'
  note: string | null
  book_id: string
  from_user_id: string
  book: { title: string; author: string } | null
  from_user: { name: string } | null
  to_user: { name: string } | null
}

const SwapHistory = () => {
  const { isReady, isAuthenticated, login } = useAuth()
  const { profile } = useProfile()
  const [swaps, setSwaps] = useState<SwapRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      login()
      return
    }
    if (profile) fetchSwaps()
  }, [profile, isReady, isAuthenticated])

  const fetchSwaps = async () => {
    if (!profile) return
    try {
      const { data, error } = await supabase
        .from("swaps")
        .select(`
          id, swapped_at, returned_at, status, note, book_id, from_user_id,
          book:books(title, author),
          from_user:profiles!swaps_from_user_id_fkey(name),
          to_user:profiles!swaps_to_user_id_fkey(name)
        `)
        .or(`from_user_id.eq.${profile.id},to_user_id.eq.${profile.id}`)
        .order("swapped_at", { ascending: false })

      if (error) throw error
      setSwaps((data as unknown as SwapRecord[]) || [])
    } catch (error) {
      toast.error("無法載入換書紀錄")
    } finally {
      setLoading(false)
    }
  }

  const handleReturn = async (swap: SwapRecord) => {
    try {
      const { error: swapError } = await supabase
        .from("swaps")
        .update({ status: 'returned' as const, returned_at: new Date().toISOString() })
        .eq("id", swap.id)
      if (swapError) throw swapError

      const { error: bookError } = await supabase
        .from("books")
        .update({ status: 'available' as const })
        .eq("id", swap.book_id)
      if (bookError) throw bookError

      setSwaps(swaps.map((s) =>
        s.id === swap.id
          ? { ...s, status: 'returned' as const, returned_at: new Date().toISOString() }
          : s
      ))
      toast.success("已標記歸還")
    } catch (error) {
      toast.error("操作失敗")
    }
  }

  const activeSwaps = swaps.filter((s) => s.status === 'active')
  const returnedSwaps = swaps.filter((s) => s.status === 'returned')

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">換書紀錄</h1>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}><CardContent className="py-6"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
            ))}
          </div>
        ) : swaps.length === 0 ? (
          <div className="text-center py-16">
            <History className="h-20 w-20 mx-auto text-muted-foreground/50" />
            <p className="text-xl font-medium text-muted-foreground mt-4">還沒有換書紀錄</p>
          </div>
        ) : (
          <>
            {activeSwaps.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="default">換出中</Badge>
                  <span className="text-muted-foreground text-sm">{activeSwaps.length} 本</span>
                </h2>
                <div className="space-y-3">
                  {activeSwaps.map((swap) => (
                    <SwapCard
                      key={swap.id}
                      swap={swap}
                      isOwner={swap.from_user_id === profile?.id}
                      onReturn={() => handleReturn(swap)}
                    />
                  ))}
                </div>
              </section>
            )}

            {returnedSwaps.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="secondary">已歸還</Badge>
                  <span className="text-muted-foreground text-sm">{returnedSwaps.length} 筆</span>
                </h2>
                <div className="space-y-3">
                  {returnedSwaps.map((swap) => (
                    <SwapCard key={swap.id} swap={swap} isOwner={false} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <Navigation />
    </div>
  )
}

function SwapCard({ swap, isOwner, onReturn }: { swap: SwapRecord; isOwner: boolean; onReturn?: () => void }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{swap.from_user?.name}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{swap.to_user?.name}</span>
              <Badge variant={swap.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                {swap.status === 'active' ? '換出中' : '已歸還'}
              </Badge>
            </div>
            <p className="text-lg font-bold mt-1">
              {swap.book?.title}
              <span className="text-sm font-normal text-muted-foreground ml-2">{swap.book?.author}</span>
            </p>
            {swap.note && <p className="text-sm text-muted-foreground mt-1">{swap.note}</p>}
            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
              <span>換出 {new Date(swap.swapped_at).toLocaleDateString("zh-TW")}</span>
              {swap.returned_at && (
                <span>歸還 {new Date(swap.returned_at).toLocaleDateString("zh-TW")}</span>
              )}
            </div>
          </div>

          {isOwner && swap.status === 'active' && onReturn && (
            <Button variant="outline" size="sm" onClick={onReturn} className="ml-2 shrink-0">
              <Undo2 className="h-3 w-3 mr-1" />
              歸還
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default SwapHistory
