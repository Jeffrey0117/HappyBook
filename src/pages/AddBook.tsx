import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Upload, X } from "lucide-react"
import { toast } from "sonner"
import Navigation from "@/components/Navigation"
import { useProfile } from "@/hooks/use-profile"

const AddBook = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const { profile } = useProfile()

  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [tags, setTags] = useState("")
  const [status, setStatus] = useState<"available" | "swapped">("available")
  const [coverUrl, setCoverUrl] = useState("")
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  useEffect(() => {
    if (isEditing) fetchBook()
  }, [id])

  const fetchBook = async () => {
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error
      setTitle(data.title)
      setAuthor(data.author)
      setTags(data.tags?.join(", ") || "")
      setStatus(data.status as "available" | "swapped")
      if (data.cover_url) {
        setCoverUrl(data.cover_url)
        setCoverPreview(data.cover_url)
      }
    } catch (error) {
      toast.error("無法載入書籍資料")
      navigate("/my")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) {
      toast.error("請先登入")
      return
    }
    setLoading(true)

    try {
      const tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t)

      const bookData = {
        title,
        author,
        tags: tagsArray,
        status,
        owner_id: profile.id,
        cover_url: coverUrl || null,
      }

      if (isEditing) {
        const { error } = await supabase.from("books").update(bookData).eq("id", id)
        if (error) throw error
        toast.success("書籍已更新")
      } else {
        const { error } = await supabase.from("books").insert([bookData])
        if (error) throw error
        toast.success("書籍已上架")
      }

      navigate("/my")
    } catch (error: any) {
      toast.error(error.message || "操作失敗")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "編輯書籍" : "上架新書"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>封面圖片</Label>
                <div className="flex items-center gap-4">
                  {coverPreview ? (
                    <div className="relative">
                      <img
                        src={coverPreview}
                        alt="封面預覽"
                        className="w-32 h-48 object-cover rounded-lg border-2 border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => { setCoverUrl(""); setCoverPreview(null) }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-32 h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">無封面</span>
                    </div>
                  )}
                  <Input
                    value={coverUrl}
                    onChange={(e) => { setCoverUrl(e.target.value); setCoverPreview(e.target.value) }}
                    placeholder="輸入封面圖片網址"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">書名 *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="輸入書名" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">作者 *</Label>
                <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="輸入作者" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">標籤</Label>
                <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="小說, 心理學, 商業 (以逗號分隔)" />
              </div>

              <div className="space-y-2">
                <Label>狀態</Label>
                <Select value={status} onValueChange={(v: "available" | "swapped") => setStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">可換</SelectItem>
                    <SelectItem value="swapped">已換出</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />處理中...</>
                ) : (
                  isEditing ? "更新書籍" : "上架書籍"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Navigation />
    </div>
  )
}

export default AddBook
