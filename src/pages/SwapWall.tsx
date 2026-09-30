import { useState, useEffect } from "react"
import { selfize, type SwapRequestExpanded } from "@/lib/selfize"
import { Card, CardContent } from "@/components/ui/card"
import Navigation from "@/components/Navigation"
import { Camera, ArrowLeftRight } from "lucide-react"

const SwapWall = () => {
  const [swaps, setSwaps] = useState<SwapRequestExpanded[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCompletedSwaps()
  }, [])

  const fetchCompletedSwaps = async () => {
    try {
      const { items } = await selfize.list<SwapRequestExpanded>("swap_requests", {
        status: "completed",
        sort: "-completed_at",
        limit: "50",
        expand: "requester_id,requester_book_id,owner_id,owner_book_id",
      })
      const withPhotos = items.filter(
        (s) => s.requester_photo_url || s.owner_photo_url
      )
      setSwaps(withPhotos)
    } catch (error) {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    return date.toLocaleDateString("zh-TW", {
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">換書牆</h1>
          <p className="text-sm text-muted-foreground mt-1">
            成功交換的記錄
          </p>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : swaps.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <Camera className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <p className="text-lg text-muted-foreground">還沒有完成的換書記錄</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {swaps.map((swap) => {
              const photo = swap.requester_photo_url || swap.owner_photo_url
              const requesterName = swap.requester_id_expanded?.display_name || "使用者"
              const ownerName = swap.owner_id_expanded?.display_name || "使用者"
              const requesterBook = swap.requester_book_id_expanded?.title || "書"
              const ownerBook = swap.owner_book_id_expanded?.title || "書"

              return (
                <Card key={swap.id} className="overflow-hidden">
                  {photo && (
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img
                        src={photo}
                        alt="換書照片"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center gap-1 text-sm">
                      <span className="truncate">{requesterName} 的《{requesterBook}》</span>
                      <ArrowLeftRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate">{ownerName} 的《{ownerBook}》</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(swap.completed_at)}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <Navigation />
    </div>
  )
}

export default SwapWall
