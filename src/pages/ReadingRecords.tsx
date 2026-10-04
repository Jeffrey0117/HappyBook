import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { selfize, selfizeUser, type Book, type ReadingRecord } from "@/lib/selfize"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import { ArrowLeft, Plus, Loader2, BookOpen, MessageCircleQuestion, Trash2, LogIn } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"

const ReadingRecords = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isReady, login } = useAuth()
  const [records, setRecords] = useState<ReadingRecord[]>([])
  const [books, setBooks] = useState<Record<string, Book>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isReady && isAuthenticated) fetchData()
    if (isReady && !isAuthenticated) setLoading(false)
  }, [isReady, isAuthenticated])

  const fetchData = async () => {
    try {
      const { items } = await selfizeUser.list<ReadingRecord>("reading_records", { perPage: "200", sort: "-created_at" })
      setRecords(items)
      const { items: allBooks } = await selfize.list<Book>("books", { perPage: "200" })
      const map: Record<string, Book> = {}
      for (const b of allBooks) map[b.id] = b
      setBooks(map)
    } catch (error) {
      toast.error("載入閱讀紀錄失敗")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("刪除這筆閱讀紀錄？")) return
    try {
      await selfizeUser.delete("reading_records", id)
      setRecords((prev) => prev.filter((r) => r.id !== id))
      toast.success("已刪除")
    } catch (error) {
      toast.error("刪除失敗")
    }
  }

  if (isReady && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-screen-md mx-auto px-4 pt-16 text-center">
          <p className="text-muted-foreground mb-4">登入後開始累積你的私人閱讀資料庫</p>
          <Button onClick={login}><LogIn className="w-4 h-4 mr-2" />登入</Button>
        </div>
        <Navigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-md mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => navigate("/my")} className="flex items-center text-muted-foreground text-sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> 我的書架
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/ask"><MessageCircleQuestion className="w-4 h-4 mr-1" />問我的書</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/my/records/add"><Plus className="w-4 h-4 mr-1" />新增紀錄</Link>
            </Button>
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-1">閱讀紀錄</h1>
        <p className="text-sm text-muted-foreground mb-6">
          私人資料庫：書頁原文、你的心得——只有你自己與 AI 討論室看得到。
        </p>

        {loading ? (
          <div className="flex justify-center pt-16"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : records.length === 0 ? (
          <div className="text-center pt-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="mb-4">還沒有閱讀紀錄。拍幾頁正在讀的書，開始累積吧。</p>
            <Button asChild><Link to="/my/records/add"><Plus className="w-4 h-4 mr-1" />第一筆紀錄</Link></Button>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((rec) => (
              <div key={rec.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      《{books[rec.book_id]?.title || "未知書籍"}》
                      {rec.chapter ? <span className="text-muted-foreground font-normal">　{rec.chapter}</span> : null}
                      {rec.pages ? <span className="text-muted-foreground font-normal">　p.{rec.pages}</span> : null}
                    </p>
                    {(rec.topic_tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(rec.topic_tags || []).map((t) => (
                          <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleDelete(rec.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {rec.source_text ? (
                  <p className="text-sm mt-2 text-muted-foreground line-clamp-3 whitespace-pre-line">{rec.source_text}</p>
                ) : null}
                {rec.my_note ? (
                  <p className="text-sm mt-2 border-l-2 border-primary pl-2 whitespace-pre-line">💭 {rec.my_note}</p>
                ) : null}
                {(rec.images || []).length > 0 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto">
                    {(rec.images || []).map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="書頁" className="h-16 rounded-md border border-border" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <Navigation />
    </div>
  )
}

export default ReadingRecords
