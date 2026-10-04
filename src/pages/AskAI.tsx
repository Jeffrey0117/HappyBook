import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import Navigation from "@/components/Navigation"
import { Loader2, MessageCircleQuestion, BookOpen, LogIn, Send } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import ReactMarkdown from "react-markdown"

interface Source {
  id: string
  book: string
  chapter: string
  pages: string
  excerpt: string
  images: string[]
}

const AskAI = () => {
  const { isAuthenticated, isReady, login } = useAuth()
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [sources, setSources] = useState<Source[]>([])
  const [asking, setAsking] = useState(false)

  const handleAsk = async () => {
    if (!question.trim()) return
    setAsking(true)
    setAnswer("")
    setSources([])
    try {
      const token = window.letmeuse?.getToken?.() || ""
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAnswer(data.answer)
      setSources(data.sources || [])
    } catch (error: any) {
      toast.error(error.message || "AI 回答失敗")
    } finally {
      setAsking(false)
    }
  }

  if (isReady && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-screen-md mx-auto px-4 pt-16 text-center">
          <MessageCircleQuestion className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground mb-4">登入後，用你讀過的書回答你現在的問題</p>
          <Button onClick={login}><LogIn className="w-4 h-4 mr-2" />登入</Button>
        </div>
        <Navigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-md mx-auto px-4 pt-6">
        <h1 className="text-2xl font-bold mb-1">問我的書</h1>
        <p className="text-sm text-muted-foreground mb-5">
          提出實際的問題，AI 會從<strong>你收錄的閱讀紀錄</strong>找相關觀念回答，附來源。
          資料不夠就會直說，不會編。
        </p>

        <div className="flex gap-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            placeholder="例：我辦的活動報名人數很少，該繼續辦還是取消？"
            className="flex-1"
          />
          <Button onClick={handleAsk} disabled={asking || !question.trim()} className="self-end">
            {asking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {asking && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm mt-6">
            <Loader2 className="w-4 h-4 animate-spin" /> 翻你的閱讀資料庫中…
          </div>
        )}

        {answer && (
          <div className="mt-6 bg-card border border-border rounded-xl p-5 prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        )}

        {sources.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">引用來源</p>
            <div className="space-y-2">
              {sources.map((s, i) => (
                <div key={s.id} className="bg-muted/50 border border-border rounded-lg p-3 text-sm">
                  <p className="font-medium">
                    【來源 {i + 1}】《{s.book}》{s.chapter ? `　${s.chapter}` : ""}{s.pages ? `　p.${s.pages}` : ""}
                  </p>
                  {s.excerpt && <p className="text-muted-foreground mt-1 line-clamp-2">{s.excerpt}…</p>}
                  {s.images.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {s.images.slice(0, 3).map((url) => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="原始書頁" className="h-14 rounded border border-border" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <Button variant="outline" size="sm" asChild>
            <Link to="/my/records"><BookOpen className="w-4 h-4 mr-1" />管理我的閱讀紀錄</Link>
          </Button>
        </div>
      </div>
      <Navigation />
    </div>
  )
}

export default AskAI
