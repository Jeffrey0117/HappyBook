import { useState, useEffect } from "react"
import { selfize, type SwapExpanded } from "@/lib/selfize"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import { ArrowRight, History, Undo2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"

const SwapHistory = () => {
  const { isReady, isAuthenticated, login } = useAuth()
  const { profile } = useProfile()
  const [swaps, setSwaps] = useState<SwapExpanded[]>([])
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
      const { items } = await selfize.list<SwapExpanded>("swaps", {
        lender_id: profile.id,
        sort: "-created_at",
        limit: "500",
        expand: "book_id,lender_id",
      })
      setSwaps(items)
    } catch (error) {
      toast.error("無法載入換書紀錄")
    } finally {
      setLoading(false)
    }
  }

  const handleReturn = async (swap: SwapExpanded) => {
    try {
      await selfize.update("swaps", swap.id, {
        status: "returned",
        returned_at: new Date().toISOString(),
      })

      await selfize.update("books", swap.book_id, { status: "available" })

      setSwaps(swaps.map((s) =>
        s.id === swap.id
          ? { ...s, status: "returned" as const, returned_at: new Date().toISOString() }
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
                      isOwner={true}
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

function SwapCard({ swap, isOwner, onReturn }: { swap: SwapExpanded; isOwner: boolean; onReturn?: () => void }) {
  const lenderName = swap.lender_id_expanded?.display_name || "我"
  const bookTitle = swap.book_id_expanded?.title || "未知書籍"
  const bookAuthor = swap.book_id_expanded?.author || ""

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{lenderName}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{swap.borrower_name}</span>
              <Badge variant={swap.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                {swap.status === 'active' ? '換出中' : '已歸還'}
              </Badge>
            </div>
            <p className="text-lg font-bold mt-1">
              {bookTitle}
              {bookAuthor && <span className="text-sm font-normal text-muted-foreground ml-2">{bookAuthor}</span>}
            </p>
            {swap.borrower_note && <p className="text-sm text-muted-foreground mt-1">{swap.borrower_note}</p>}
            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
              <span>換出 {new Date(swap.created_at).toLocaleDateString("zh-TW")}</span>
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
