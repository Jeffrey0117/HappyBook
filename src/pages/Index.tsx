import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import BookCard from "@/components/BookCard";
import { BookCardSkeleton } from "@/components/ui/skeleton-loader";
import { Search, LogOut, BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import PullToRefresh from "react-pull-to-refresh";

const Index = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      navigate("/auth");
      return;
    }

    setUser(session.user);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    fetchBooks();

    return () => subscription.unsubscribe();
  };

  const fetchBooks = async (showToast = false) => {
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBooks(data || []);
      if (showToast) {
        toast.success("已更新書籍列表");
      }
    } catch (error: any) {
      toast.error("無法載入書籍");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchBooks(true);
    setIsRefreshing(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("已登出");
  };
  const handleDeleteBook = async (id: string) => {
    try {
      const { error } = await supabase
        .from("books")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setBooks(books.filter(book => book.id !== id));
      toast.success("書籍已刪除");
    } catch (error: any) {
      toast.error("刪除失敗");
      console.error(error);
    }
  };


  // 取得所有標籤
  const allTags = Array.from(
    new Set(books.flatMap((book) => book.tags || []))
  ).sort();

  // 過濾書籍
  const filteredBooks = books.filter((book) => {
    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower && !selectedTag) return true;
    
    const matchesSearch = searchLower
      ? book.title.toLowerCase().includes(searchLower) ||
        book.author.toLowerCase().includes(searchLower) ||
        (book.tags && book.tags.some((tag: string) =>
          tag.toLowerCase().includes(searchLower)
        ))
      : true;
    
    const matchesTag = selectedTag ? book.tags?.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  // 處理搜尋輸入（防抖動）
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setIsSearching(true);
    
    // 清除之前的定時器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // 設置新的定時器（300ms 延遲）
    searchTimeoutRef.current = setTimeout(() => {
      setIsSearching(false);
    }, 300);
  };

  // 高亮搜尋關鍵詞
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query.trim()})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase()
        ? `<mark class="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">${part}</mark>`
        : part
    ).join('');
  };


  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24"
    >
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              我的書庫
            </h1>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋書名、作者或標籤..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setIsSearching(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>

          {/* 搜尋結果提示 */}
          {searchQuery && !isSearching && (
            <div className="text-sm text-muted-foreground mt-2">
              找到 {filteredBooks.length} 本符合「{searchQuery}」的書籍
            </div>
          )}

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              <Badge
                variant={selectedTag === null ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap min-h-[44px] flex items-center px-4 text-base"
                onClick={() => setSelectedTag(null)}
              >
                全部
              </Badge>
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap min-h-[44px] flex items-center px-4 text-base"
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Books Grid */}
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {loading || isSearching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <BookCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-16 space-y-6">
            <BookOpen className="h-20 w-20 mx-auto text-muted-foreground/50" />
            <div className="space-y-2">
              <p className="text-xl font-medium text-muted-foreground">
                {searchQuery || selectedTag
                  ? "找不到符合的書籍"
                  : "開始建立您的閱讀書庫"}
              </p>
              {!searchQuery && !selectedTag && (
                <>
                  <p className="text-sm text-muted-foreground">
                    新增第一本書，開始記錄您的閱讀旅程
                  </p>
                  <Button
                    onClick={() => navigate("/add")}
                    className="mt-4"
                    size="lg"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    新增第一本書
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                id={book.id}
                title={book.title}
                author={book.author}
                tags={book.tags || []}
                progress={book.progress}
                rating={book.rating}
                onDelete={handleDeleteBook}
              />
            ))}
          </div>
        )}
      </main>

        <Navigation />
      </div>
    </PullToRefresh>
  );
};

export default Index;
