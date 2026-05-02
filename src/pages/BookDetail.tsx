import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Star, Save, Clock, Loader2, Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import MarkdownToolbar from "@/components/MarkdownToolbar";
import { BookDetailSkeleton } from "@/components/ui/skeleton-loader";

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousContentRef = useRef<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBookAndNotes();
  }, [id]);

  const fetchBookAndNotes = async () => {
    try {
      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .single();

      if (bookError) throw bookError;

      const { data: notesData, error: notesError } = await supabase
        .from("notes")
        .select("*")
        .eq("book_id", id)
        .order("created_at", { ascending: true });

      if (notesError) throw notesError;

      setBook(bookData);
      
      // 確保三個區域都有筆記
      const sections: Array<"摘錄" | "思考" | "實踐"> = ["摘錄", "思考", "實踐"];
      const existingNotes = notesData || [];
      const allNotes = sections.map((section) => {
        const existing = existingNotes.find((n) => n.section === section);
        return existing || { section, content: "", book_id: id };
      });

      setNotes(allNotes);
    } catch (error: any) {
      toast.error("無法載入書籍資料");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  // 自動儲存函數
  const autoSave = useCallback(async (section: string, content: string) => {
    if (content === previousContentRef.current) return;
    
    setAutoSaving(true);
    try {
      const note = notes.find((n) => n.section === section);

      if (note.id) {
        const { error } = await supabase
          .from("notes")
          .update({ content })
          .eq("id", note.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("notes")
          .insert([
            {
              book_id: id,
              section: section as "摘錄" | "思考" | "實踐",
              content,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        setNotes((prev) =>
          prev.map((n) => (n.section === section ? { ...n, ...data } : n))
        );
      }

      setNotes((prev) =>
        prev.map((n) =>
          n.section === section ? { ...n, content } : n
        )
      );

      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      previousContentRef.current = content;
      toast.success("自動儲存成功", { duration: 1000 });
    } catch (error: any) {
      toast.error("自動儲存失敗", { duration: 2000 });
    } finally {
      setAutoSaving(false);
    }
  }, [notes, id]);

  // 設置自動儲存定時器
  useEffect(() => {
    if (editingSection && hasUnsavedChanges && editContent) {
      // 清除之前的定時器
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // 設置新的30秒定時器
      autoSaveTimerRef.current = setTimeout(() => {
        autoSave(editingSection, editContent);
      }, 30000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [editContent, editingSection, hasUnsavedChanges, autoSave]);

  // 鍵盤快捷鍵處理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S 或 Cmd+S 儲存
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && editingSection) {
        e.preventDefault();
        handleSave(editingSection);
      }
      // Esc 取消編輯
      else if (e.key === 'Escape' && editingSection) {
        e.preventDefault();
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingSection, editContent]);

  const handleEdit = (section: string, content: string) => {
    setEditingSection(section);
    setEditContent(content);
    previousContentRef.current = content;
    setHasUnsavedChanges(false);
    setLastSaved(null);
  };

  const handleContentChange = (value: string) => {
    setEditContent(value);
    if (value !== previousContentRef.current) {
      setHasUnsavedChanges(true);
    }
  };

  // 處理 Markdown 工具欄插入
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  const handleMarkdownInsert = (before: string, after: string = "", placeholder: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end) || placeholder;
    
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    handleContentChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("請先登入");

      if (file.size > 5 * 1024 * 1024) {
        toast.error("圖片大小不能超過 5MB");
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('note-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('note-images')
        .getPublicUrl(fileName);

      const imageUrl = data.publicUrl;
      const markdownImage = `\n![圖片](${imageUrl})\n`;
      
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, end) + markdownImage + text.substring(end);
        handleContentChange(newText);
        
        setTimeout(() => {
          textarea.focus();
          const newCursorPos = end + markdownImage.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
      }

      toast.success("圖片已上傳");
    } catch (error: any) {
      toast.error("圖片上傳失敗: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm("有未儲存的變更，確定要取消嗎？");
      if (!confirm) return;
    }
    setEditingSection(null);
    setEditContent("");
    setHasUnsavedChanges(false);
    setLastSaved(null);
  };

  const handleSave = async (section: string) => {
    setSaving(true);
    try {
      const note = notes.find((n) => n.section === section);

      if (note.id) {
        // 更新現有筆記
        const { error } = await supabase
          .from("notes")
          .update({ content: editContent })
          .eq("id", note.id);

        if (error) throw error;
      } else {
        // 建立新筆記
        const { data, error } = await supabase
          .from("notes")
          .insert([
            {
              book_id: id,
              section: section as "摘錄" | "思考" | "實踐",
              content: editContent,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        // 更新本地狀態以包含新建立的筆記 ID
        setNotes((prev) =>
          prev.map((n) => (n.section === section ? { ...n, ...data } : n))
        );
      }

      // 更新本地狀態
      setNotes((prev) =>
        prev.map((n) =>
          n.section === section ? { ...n, content: editContent } : n
        )
      );

      setEditingSection(null);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      previousContentRef.current = editContent;
      toast.success("已儲存");
    } catch (error: any) {
      toast.error("儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  // 格式化最後儲存時間
  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}秒前儲存`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分鐘前儲存`;
    return `${Math.floor(diff / 3600)}小時前儲存`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-6">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="mb-6">
            <Button variant="ghost" disabled className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回書庫
            </Button>
            <BookDetailSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!book) return null;

  const progressColors = {
    未讀: "bg-muted text-muted-foreground",
    閱讀中: "bg-secondary/20 text-secondary",
    已讀: "bg-primary/20 text-primary",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-6">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回書庫
          </Button>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
                  <p className="text-lg text-muted-foreground">{book.author}</p>
                </div>
                <Link to={`/edit/${book.id}`}>
                  <Button variant="outline" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <Badge className={cn("text-sm", progressColors[book.progress])}>
                  {book.progress}
                </Badge>

                {book.rating && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < book.rating
                            ? "fill-secondary text-secondary"
                            : "text-muted"
                        )}
                      />
                    ))}
                  </div>
                )}

                {book.tags && book.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {book.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notes Tabs */}
        <Tabs defaultValue="摘錄" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="摘錄">摘錄</TabsTrigger>
            <TabsTrigger value="思考">思考</TabsTrigger>
            <TabsTrigger value="實踐">實踐</TabsTrigger>
          </TabsList>

          {notes.map((note) => (
            <TabsContent key={note.section} value={note.section} className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  {editingSection === note.section ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-muted-foreground">
                          支援 Markdown 格式 • 每30秒自動儲存 • Ctrl+S 手動儲存
                        </div>
                        {(autoSaving || lastSaved) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {autoSaving ? (
                              <span className="text-primary">自動儲存中...</span>
                            ) : lastSaved ? (
                              <span>{formatLastSaved(lastSaved)}</span>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <div>
                        <MarkdownToolbar onInsert={handleMarkdownInsert} />
                        <Textarea
                          ref={textareaRef}
                          value={editContent}
                          onChange={(e) => handleContentChange(e.target.value)}
                          placeholder={`在此輸入${note.section}內容...`}
                          className="min-h-[300px] font-mono rounded-t-none border-t-0"
                          onKeyDown={(e) => {
                            // 防止 Tab 鍵跳出文本框
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              const start = e.currentTarget.selectionStart;
                              const end = e.currentTarget.selectionEnd;
                              const value = e.currentTarget.value;
                              const newValue = value.substring(0, start) + '  ' + value.substring(end);
                              handleContentChange(newValue);
                              setTimeout(() => {
                                e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
                              }, 0);
                            }
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleSave(note.section)}
                            disabled={saving || autoSaving}
                          >
                            {saving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                儲存中...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-4 w-4" />
                                儲存 (Ctrl+S)
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCancel}
                          >
                            取消 (Esc)
                          </Button>
                        </div>
                        {hasUnsavedChanges && (
                          <span className="text-sm text-amber-600">
                            有未儲存的變更
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {note.content ? (
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {note.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">
                          尚無{note.section}筆記
                        </p>
                      )}
                      <div className="mt-4 pt-4 border-t">
                        <Button
                          onClick={() => handleEdit(note.section, note.content)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          編輯{note.section}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default BookDetail;
