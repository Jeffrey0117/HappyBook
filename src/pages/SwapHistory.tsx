import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import Navigation from "@/components/Navigation"
import { ArrowRight, History } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"

interface SwapRecord {
  id: string
  swapped_at: string
  note: string | null
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
          id, swapped_at, note,
          book:books(title, author),
          from_user:profiles!swaps_from_user_id_fkey(name),
          to_user:profiles!swaps_to_user_id_fkey(name)
        `)
        .or(`from_user_id.eq.${profile.id},to_user_id.eq.${profile.id}`)
        .order("swapped_at", { ascending: false })

      if (error) throw error
      setSwaps((data as unknown as SwapRecord[]) || [])
    } catch (error) {
      console.error("Failed to load swaps:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">換書紀錄</h1>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-4">
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
          swaps.map((swap) => (
            <Card key={swap.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{swap.from_user?.name}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{swap.to_user?.name}</span>
                </div>
                <p className="text-lg font-bold mt-1">
                  {swap.book?.title}
                  <span className="text-sm font-normal text-muted-foreground ml-2">{swap.book?.author}</span>
                </p>
                {swap.note && <p className="text-sm text-muted-foreground mt-1">{swap.note}</p>}
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(swap.swapped_at).toLocaleDateString("zh-TW")}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <Navigation />
    </div>
  )
}

export default SwapHistory
