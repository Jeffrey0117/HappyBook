import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { Search, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface NoteWithBook {
  id: string;
  content: string;
  section: string;
  book: {
    id: string;
    title: string;
    author: string;
  };
}

const Theme = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<NoteWithBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    checkAuthAndFetchNotes();
  }, []);

  const checkAuthAndFetchNotes = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      navigate("/auth");
      return;
    }

    fetchNotes();
  };

  const fetchNotes = async () => {
    try {
      // 先取得用戶的所有書籍
      const { data: books, error: booksError } = await supabase
        .from("books")
        .select("id, title, author");

      if (booksError) throw booksError;

      if (!books || books.length === 0) {
        setNotes([]);
        setLoading(false);
        return;
      }

      // 取得這些書籍的所有筆記
      const { data: notesData, error: notesError } = await supabase
        .from("notes")
        .select("id, content, section, book_id")
        .in(
          "book_id",
          books.map((b) => b.id)
        )
        .neq("content", "")
        .order("created_at", { ascending: false });

      if (notesError) throw notesError;

      // 組合資料
      const notesWithBooks = notesData?.map((note) => {
        const book = books.find((b) => b.id === note.book_id);
        return {
          id: note.id,
          content: note.content,
          section: note.section,
          book: {
            id: note.book_id,
            title: book?.title || "",
            author: book?.author || "",
          },
        };
      });

      setNotes(notesWithBooks || []);
    } catch (error: any) {
      toast.error("無法載入筆記");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 搜尋過濾
  const filteredNotes = notes.filter(
    (note) =>
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSectionColor = (section: string) => {
    switch (section) {
      case "摘錄":
        return "bg-primary/20 text-primary";
      case "思考":
        return "bg-secondary/20 text-secondary";
      case "實踐":
        return "bg-accent/20 text-accent";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
            主題整理
          </h1>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋筆記內容、書名或作者..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      {/* Notes List */}
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground text-lg">
              {searchQuery ? "找不到符合的筆記" : "尚無筆記內容"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Link
                        to={`/book/${note.book.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        <CardTitle className="text-lg">{note.book.title}</CardTitle>
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">
                        {note.book.author}
                      </p>
                    </div>
                    <Badge className={getSectionColor(note.section)}>
                      {note.section}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm prose-slate dark:prose-invert max-w-none line-clamp-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {note.content}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
};

export default Theme;
