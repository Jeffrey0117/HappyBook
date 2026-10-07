import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { selfizeUser, type Book, type ReadingRecord } from "@/lib/selfize"
import { useMyBooks } from "@/hooks/use-my-books"
import { useProfile } from "@/hooks/use-profile"
import { useAuth } from "@/hooks/use-auth"
import { compressImage, uploadToUpimg } from "@/lib/upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Navigation from "@/components/Navigation"
import { ArrowLeft, Loader2, Camera, ScanText, Sparkles, LogIn } from "lucide-react"
import { toast } from "sonner"

const AddReadingRecord = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isReady, login } = useAuth()
  const { profile } = useProfile()
  const { books } = useMyBooks(profile?.id)

  const [bookId, setBookId] = useState("")
  const [chapter, setChapter] = useState("")
  const [pages, setPages] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [sourceText, setSourceText] = useState("")
  const [aiSummary, setAiSummary] = useState("")
  const [myNote, setMyNote] = useState("")
  const [tags, setTags] = useState("")
  const [uploading, setUploading] = useState(false)
  const [ocring, setOcring] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!bookId && books.length > 0) setBookId(books[0].id)
  }, [books, bookId])

  const token = () => window.letmeuse?.getToken?.() || ""

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files).slice(0, 8)) {
        const blob = await compressImage(file)
        const url = await uploadToUpimg(blob, file.name)
        urls.push(url)
      }
      setImages((prev) => [...prev, ...urls].slice(0, 8))
      toast.success(`上傳了 ${urls.length} 張`)
    } catch (error) {
      toast.error("照片上傳失敗，再試一次")
    } finally {
      setUploading(false)
    }
  }

  const handleOcr = async () => {
    if (images.length === 0) return toast.error("先上傳書頁照片")
    setOcring(true)
    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ images }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSourceText((prev) => (prev ? prev + "\n\n" + data.text : data.text))
      toast.success("辨識完成，檢查一下文字有沒有錯")
    } catch (error: any) {
      toast.error(error.message || "辨識失敗")
    } finally {
      setOcring(false)
    }
  }

  const handleSummarize = async () => {
    if (!sourceText.trim()) return toast.error("先有原文才能整理重點")
    setSummarizing(true)
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ text: sourceText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAiSummary(data.summary)
    } catch (error: any) {
      toast.error(error.message || "AI 整理失敗")
    } finally {
      setSummarizing(false)
    }
  }

  const handleSave = async () => {
    if (!bookId) return toast.error("選一本書")
    if (!sourceText.trim() && !myNote.trim()) return toast.error("原文或心得至少留一樣")
    setSaving(true)
    try {
      await selfizeUser.create<ReadingRecord>("reading_records", {
        book_id: bookId,
        chapter: chapter.trim() || null,
        pages: pages.trim() || null,
        source_text: sourceText.trim() || null,
        ai_summary: aiSummary.trim() || null,
        my_note: myNote.trim() || null,
        topic_tags: tags.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean).slice(0, 8),
        images,
      })
      toast.success("收錄完成！AI 討論室現在找得到它了")
      navigate("/my/records")
    } catch (error) {
      toast.error("儲存失敗，再試一次")
    } finally {
      setSaving(false)
    }
  }

  if (isReady && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-screen-md mx-auto px-4 pt-16 text-center">
          <Button onClick={login}><LogIn className="w-4 h-4 mr-2" />登入後開始收錄</Button>
        </div>
        <Navigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-md mx-auto px-4 pt-6">
        <button onClick={() => navigate("/my/records")} className="flex items-center text-muted-foreground text-sm mb-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> 閱讀紀錄
        </button>
        <h1 className="text-2xl font-bold mb-1">新增閱讀紀錄</h1>
        <p className="text-sm text-muted-foreground mb-6">拍兩頁、一節或一章都行。原文、AI 重點、你的心得會分開存。</p>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium">哪本書<span className="text-destructive">*</span></label>
            <select
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {books.length === 0 && <option value="">（書架是空的，先去新增書籍）</option>}
              {books.map((b: Book) => (
                <option key={b.id} value={b.id}>{b.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">章節（選填）</label>
              <Input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="例：第三章 判斷力" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">頁碼（選填）</label>
              <Input value={pages} onChange={(e) => setPages(e.target.value)} placeholder="例：45-48" className="mt-1" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">書頁照片</label>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <label className="inline-flex items-center gap-2 border border-dashed border-border rounded-lg px-4 py-2 text-sm cursor-pointer hover:bg-muted">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {uploading ? "上傳中…" : "拍照／選圖（可多張）"}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              </label>
              <Button type="button" variant="outline" size="sm" onClick={handleOcr} disabled={ocring || images.length === 0}>
                {ocring ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ScanText className="w-4 h-4 mr-1" />}
                {ocring ? "辨識中…" : "辨識文字"}
              </Button>
            </div>
            {images.length > 0 && (
              <div className="flex gap-2 mt-2 overflow-x-auto">
                {images.map((url, i) => (
                  <div key={url} className="relative shrink-0">
                    <img src={url} alt={`書頁 ${i + 1}`} className="h-20 rounded-md border border-border" />
                    <button
                      onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">原文（辨識後請校對）</label>
            <Textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} rows={8} className="mt-1" placeholder="辨識結果會出現在這裡，也可以直接手打摘錄" />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">AI 重點整理（與原文分開存）</label>
              <Button type="button" variant="ghost" size="sm" onClick={handleSummarize} disabled={summarizing || !sourceText.trim()}>
                {summarizing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                整理重點
              </Button>
            </div>
            <Textarea value={aiSummary} onChange={(e) => setAiSummary(e.target.value)} rows={4} className="mt-1" placeholder="按「整理重點」自動生成，可修改" />
          </div>

          <div>
            <label className="text-sm font-medium">這讓我想到什麼（你的心得）</label>
            <Textarea value={myNote} onChange={(e) => setMyNote(e.target.value)} rows={3} className="mt-1" placeholder="你自己的想法、想怎麼用，跟作者的話分開存，AI 不會搞混" />
          </div>

          <div>
            <label className="text-sm font-medium">主題標籤（空格或逗號分隔）</label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="例：合作 談判 活動設計" className="mt-1" />
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            收錄進我的閱讀資料庫
          </Button>
        </div>
      </div>
      <Navigation />
    </div>
  )
}

export default AddReadingRecord
