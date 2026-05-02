import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Star, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { cn } from "@/lib/utils";

const AddBook = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [tags, setTags] = useState("");
  const [progress, setProgress] = useState<"未讀" | "閱讀中" | "已讀">("未讀");
  const [rating, setRating] = useState(0);
  const [initialNote, setInitialNote] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadUrl, setUploadUrl] = useState("");

  useEffect(() => {
    if (isEditing) {
      fetchBook();
    }
  }, [id]);

  const fetchBook = async () => {
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setTitle(data.title);
      setAuthor(data.author);
      setTags(data.tags?.join(", ") || "");
      setProgress(data.progress);
      setRating(data.rating || 0);
      if (data.cover_url) {
        setCoverUrl(data.cover_url);
        setCoverPreview(data.cover_url);
      }
    } catch (error: any) {
      toast.error("無法載入書籍資料");
      navigate("/");
    }
  };

  const handleUploadFromDukTw = async () => {
    if (!uploadUrl.trim()) {
      toast.error("請輸入圖片網址");
      return;
    }

    setUploading(true);
    try {
      // 使用 duk.tw 的圖片處理服務
      const response = await fetch(`https://duk.tw/api/upload?url=${encodeURIComponent(uploadUrl)}`);
      const data = await response.json();

      if (data.success && data.url) {
        setCoverUrl(data.url);
        setCoverPreview(data.url);
        setUploadDialogOpen(false);
        setUploadUrl("");
        toast.success("圖片上傳成功");
      } else {
        toast.error("上傳失敗：請確認網址正確");
      }
    } catch (error) {
      toast.error("上傳失敗：請稍後再試");
    } finally {
      setUploading(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCoverUrl(e.target.value);
    setCoverPreview(e.target.value);
  };

  const handleRemoveCover = () => {
    setCoverUrl("");
    setCoverPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("請先登入");

      let finalCoverUrl = isEditing ? coverUrl : null;

      const tagsArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      const bookData = {
        title,
        author,
        tags: tagsArray,
        progress,
        rating: rating || null,
        user_id: user.id,
        cover_url: finalCoverUrl,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("books")
          .update(bookData)
          .eq("id", id);

        if (error) throw error;
        toast.success("書籍已更新");
      } else {
        const { data: newBook, error } = await supabase
          .from("books")
          .insert([bookData])
          .select()
          .single();

        if (error) throw error;

        // 如果有初始筆記，建立三個區域的筆記
        if (initialNote && newBook) {
          const sections: Array<"摘錄" | "思考" | "實踐"> = ["摘錄", "思考", "實踐"];
          const notesData = sections.map((section) => ({
            book_id: newBook.id,
            section,
            content: section === "摘錄" ? initialNote : "",
          }));

          await supabase.from("notes").insert(notesData);
        }

        toast.success("書籍已新增");
      }

      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "操作失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "編輯書籍" : "新增書籍"}</CardTitle>
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
                        onClick={handleRemoveCover}
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
                  <div className="flex flex-col gap-2">
                    <Input
                      value={coverUrl}
                      onChange={handleUrlChange}
                      placeholder="輸入封面圖片網址"
                      className="w-64"
                    />
                    <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-2" />
                          上傳圖片
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>上傳圖片到 duk.tw</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            請點擊下方按鈕在新視窗開啟 duk.tw 圖床服務，上傳您的圖片後複製得到的網址，並貼回到上方的輸入框中。
                          </p>
                          <p className="text-sm text-muted-foreground">
                            duk.tw 提供穩定可靠的圖片儲存服務。
                          </p>
                          <Button
                            onClick={() => window.open('https://duk.tw/', '_blank')}
                            className="w-full"
                          >
                            開啟 duk.tw 上傳圖片
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">書名 *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="輸入書名"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">作者 *</Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="輸入作者"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">標籤</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="心理學, 商業, 哲學 (以逗號分隔)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="progress">閱讀進度</Label>
                <Select value={progress} onValueChange={(value: any) => setProgress(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="未讀">未讀</SelectItem>
                    <SelectItem value="閱讀中">閱讀中</SelectItem>
                    <SelectItem value="已讀">已讀</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>評分</Label>
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i + 1)}
                      className="focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Star
                        className={cn(
                          "h-10 w-10 transition-colors",
                          i < rating
                            ? "fill-secondary text-secondary"
                            : "text-muted hover:text-secondary/50"
                        )}
                      />
                    </button>
                  ))}
                  {rating > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRating(0)}
                    >
                      清除
                    </Button>
                  )}
                </div>
              </div>

              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="initialNote">初始筆記（選填）</Label>
                  <Textarea
                    id="initialNote"
                    value={initialNote}
                    onChange={(e) => setInitialNote(e.target.value)}
                    placeholder="可以先寫下第一筆摘錄..."
                    rows={4}
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    處理中...
                  </>
                ) : (
                  isEditing ? "更新書籍" : "新增書籍"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Navigation />
    </div>
  );
};

export default AddBook;
