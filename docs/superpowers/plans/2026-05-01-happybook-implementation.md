# HappyBook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform read-reflect into a public book-swap community site with LetMeUse auth, public browsing, and swap records.

**Architecture:** React SPA with LetMeUse script-tag auth, Supabase PostgreSQL for data. Public pages (browse, user shelf) need no login. Private pages (my shelf, swaps) require LetMeUse auth. Supabase client talks directly to DB with anon key + RLS disabled (simple public reads, auth-gated writes via edge functions or client-side checks).

**Tech Stack:** React 18, TypeScript, Vite, shadcn/ui, Tailwind, Supabase (DB only), LetMeUse (auth)

---

### Task 1: Clean up — remove notes/markdown/theme

**Files:**
- Delete: `src/pages/BookDetail.tsx`
- Delete: `src/pages/Theme.tsx`
- Delete: `src/components/MarkdownToolbar.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Navigation.tsx`
- Modify: `package.json`

- [ ] **Step 1: Delete unused files**

```bash
rm src/pages/BookDetail.tsx src/pages/Theme.tsx src/components/MarkdownToolbar.tsx
```

- [ ] **Step 2: Update App.tsx — remove deleted routes, add new ones**

Replace `src/App.tsx` with:

```tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Browse from "./pages/Browse";
import MyShelf from "./pages/MyShelf";
import UserShelf from "./pages/UserShelf";
import AddBook from "./pages/AddBook";
import SwapHistory from "./pages/SwapHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Browse />} />
          <Route path="/user/:id" element={<UserShelf />} />
          <Route path="/my" element={<MyShelf />} />
          <Route path="/my/add" element={<AddBook />} />
          <Route path="/my/edit/:id" element={<AddBook />} />
          <Route path="/swaps" element={<SwapHistory />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
```

- [ ] **Step 3: Remove unused dependencies from package.json**

Remove these from dependencies: `react-markdown`, `remark-gfm`, `react-pull-to-refresh`, `recharts`, `next-themes`

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor: remove notes, markdown, theme from read-reflect"
```

---

### Task 2: Add LetMeUse auth hook + script tag

**Files:**
- Create: `src/hooks/use-auth.ts`
- Modify: `index.html`
- Delete: `src/pages/Auth.tsx`

- [ ] **Step 1: Add LetMeUse script to index.html**

Add before closing `</head>` in `index.html`:

```html
<script
  src="https://letmeuse.pipee.tw/letmeuse.js"
  data-app-id="HAPPYBOOK_APP_ID"
  data-theme="auto"
  data-accent="#f59e0b"
  data-locale="zh"
  data-mode="modal"
></script>
```

Note: `HAPPYBOOK_APP_ID` needs to be created in LetMeUse admin first.

- [ ] **Step 2: Create src/hooks/use-auth.ts**

```typescript
import { useEffect, useState, useCallback } from 'react'

export interface LetMeUseUser {
  id: string
  email: string
  displayName: string
  avatar?: string
  role: string
  appId: string
}

declare global {
  interface Window {
    letmeuse?: {
      ready: boolean
      user: LetMeUseUser | null
      login(): void
      register(): void
      logout(): Promise<void>
      getToken(): string | null
      onAuthChange(cb: (user: LetMeUseUser | null) => void): () => void
    }
  }
}

export function useAuth() {
  const [user, setUser] = useState<LetMeUseUser | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const init = () => {
      const lmu = window.letmeuse
      if (!lmu) return false

      setUser(lmu.user)
      setIsReady(lmu.ready)

      unsubscribe = lmu.onAuthChange((newUser) => {
        setUser(newUser)
      })

      return true
    }

    if (!init()) {
      const interval = setInterval(() => {
        if (init()) clearInterval(interval)
      }, 100)
      return () => clearInterval(interval)
    }

    return () => unsubscribe?.()
  }, [])

  const login = useCallback(() => window.letmeuse?.login(), [])
  const logout = useCallback(() => window.letmeuse?.logout(), [])

  return { user, isReady, login, logout, isAuthenticated: !!user }
}
```

- [ ] **Step 3: Delete Auth.tsx**

```bash
rm src/pages/Auth.tsx
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add LetMeUse auth hook, remove Supabase auth"
```

---

### Task 3: Update Supabase types for new schema

**Files:**
- Modify: `src/integrations/supabase/types.ts`

- [ ] **Step 1: Replace types.ts with new schema types**

Replace entire `src/integrations/supabase/types.ts` with:

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          letmeuse_id: string
          name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          letmeuse_id: string
          name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          letmeuse_id?: string
          name?: string
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          id: string
          owner_id: string
          title: string
          author: string
          cover_url: string | null
          tags: string[] | null
          status: 'available' | 'swapped'
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          author: string
          cover_url?: string | null
          tags?: string[] | null
          status?: 'available' | 'swapped'
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          author?: string
          cover_url?: string | null
          tags?: string[] | null
          status?: 'available' | 'swapped'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      swaps: {
        Row: {
          id: string
          book_id: string
          from_user_id: string
          to_user_id: string
          note: string | null
          swapped_at: string
        }
        Insert: {
          id?: string
          book_id: string
          from_user_id: string
          to_user_id: string
          note?: string | null
          swapped_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          from_user_id?: string
          to_user_id?: string
          note?: string | null
          swapped_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "swaps_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swaps_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swaps_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      book_status: 'available' | 'swapped'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Book = Database['public']['Tables']['books']['Row']
export type Swap = Database['public']['Tables']['swaps']['Row']
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "refactor: update Supabase types for book-swap schema"
```

---

### Task 4: Create profile sync hook

**Files:**
- Create: `src/hooks/use-profile.ts`

- [ ] **Step 1: Create use-profile.ts**

This hook syncs LetMeUse user → Supabase profiles table on login.

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './use-auth'
import type { Profile } from '@/integrations/supabase/types'

export function useProfile() {
  const { user, isAuthenticated } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setProfile(null)
      setLoading(false)
      return
    }

    syncProfile()
  }, [user, isAuthenticated])

  const syncProfile = async () => {
    if (!user) return

    try {
      // Try to find existing profile
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('letmeuse_id', user.id)
        .single()

      if (existing) {
        // Update name/avatar if changed
        const needsUpdate =
          existing.name !== user.displayName ||
          existing.avatar_url !== (user.avatar || null)

        if (needsUpdate) {
          const { data: updated } = await supabase
            .from('profiles')
            .update({
              name: user.displayName,
              avatar_url: user.avatar || null,
            })
            .eq('id', existing.id)
            .select()
            .single()

          setProfile(updated || existing)
        } else {
          setProfile(existing)
        }
      } else {
        // Create new profile
        const { data: created } = await supabase
          .from('profiles')
          .insert({
            letmeuse_id: user.id,
            name: user.displayName,
            avatar_url: user.avatar || null,
          })
          .select()
          .single()

        setProfile(created)
      }
    } catch (error) {
      console.error('Profile sync failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return { profile, loading }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add profile sync hook (LetMeUse → Supabase)"
```

---

### Task 5: Build Browse page (public homepage)

**Files:**
- Create: `src/pages/Browse.tsx`
- Delete: `src/pages/Index.tsx`

- [ ] **Step 1: Delete old Index.tsx**

```bash
rm src/pages/Index.tsx
```

- [ ] **Step 2: Create Browse.tsx**

```tsx
import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import BookCard from "@/components/BookCard"
import { BookCardSkeleton } from "@/components/ui/skeleton-loader"
import { Search, BookOpen } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface BookWithOwner {
  id: string
  title: string
  author: string
  cover_url: string | null
  tags: string[] | null
  status: string
  owner_id: string
  created_at: string
  profiles: { id: string; name: string; avatar_url: string | null } | null
}

const Browse = () => {
  const { user, login, logout, isAuthenticated } = useAuth()
  const [books, setBooks] = useState<BookWithOwner[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    fetchBooks()
  }, [])

  const fetchBooks = async () => {
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*, profiles(id, name, avatar_url)")
        .eq("status", "available")
        .order("created_at", { ascending: false })

      if (error) throw error
      setBooks((data as BookWithOwner[]) || [])
    } catch (error) {
      console.error("Failed to load books:", error)
    } finally {
      setLoading(false)
    }
  }

  const allTags = Array.from(
    new Set(books.flatMap((book) => book.tags || []))
  ).sort()

  const filteredBooks = books.filter((book) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q && !selectedTag) return true

    const matchesSearch = q
      ? book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        (book.tags && book.tags.some((tag) => tag.toLowerCase().includes(q)))
      : true

    const matchesTag = selectedTag ? book.tags?.includes(selectedTag) : true
    return matchesSearch && matchesTag
  })

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setIsSearching(true)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => setIsSearching(false), 300)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              換書不可
            </h1>
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link to="/my">
                  <Button variant="outline" size="sm">我的書架</Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout}>登出</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={login}>登入</Button>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋書名、作者或標籤..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {searchQuery && !isSearching && (
            <div className="text-sm text-muted-foreground mt-2">
              找到 {filteredBooks.length} 本可換的書
            </div>
          )}

          {allTags.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              <Badge
                variant={selectedTag === null ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => setSelectedTag(null)}
              >
                全部
              </Badge>
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </header>

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
            <p className="text-xl font-medium text-muted-foreground">
              {searchQuery || selectedTag ? "找不到符合的書籍" : "還沒有人上架書籍"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                ownerName={book.profiles?.name || "未知"}
                showOwner
              />
            ))}
          </div>
        )}
      </main>

      <Navigation />
    </div>
  )
}

export default Browse
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add public Browse page with search and tags"
```

---

### Task 6: Rebuild BookCard for swap context

**Files:**
- Modify: `src/components/BookCard.tsx`

- [ ] **Step 1: Replace BookCard.tsx**

```tsx
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookMarked, User } from "lucide-react"

interface BookCardProps {
  book: {
    id: string
    title: string
    author: string
    tags: string[] | null
    status: string
    cover_url: string | null
    owner_id: string
  }
  ownerName?: string
  showOwner?: boolean
  actions?: React.ReactNode
}

const BookCard = ({ book, ownerName, showOwner = false, actions }: BookCardProps) => {
  return (
    <Card className="group hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors">
              {book.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{book.author}</p>
          </div>
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="w-12 h-16 object-cover rounded flex-shrink-0"
            />
          ) : (
            <BookMarked className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant={book.status === "available" ? "default" : "secondary"}>
            {book.status === "available" ? "可換" : "已換出"}
          </Badge>
          {showOwner && ownerName && (
            <Link
              to={`/user/${book.owner_id}`}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <User className="h-3 w-3" />
              {ownerName}
            </Link>
          )}
        </div>
        {book.tags && book.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {book.tags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs px-2 py-0.5">
                {tag}
              </Badge>
            ))}
            {book.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                +{book.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        {actions && <div className="pt-2 border-t">{actions}</div>}
      </CardContent>
    </Card>
  )
}

export default BookCard
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "refactor: rebuild BookCard for book-swap context"
```

---

### Task 7: Update Navigation

**Files:**
- Modify: `src/components/Navigation.tsx`

- [ ] **Step 1: Replace Navigation.tsx**

```tsx
import { Link, useLocation } from "react-router-dom"
import { Home, BookOpen, Plus, History } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"

const Navigation = () => {
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  const navItems = [
    { path: "/", icon: Home, label: "瀏覽" },
    ...(isAuthenticated
      ? [
          { path: "/my", icon: BookOpen, label: "書架" },
          { path: "/my/add", icon: Plus, label: "上架" },
          { path: "/swaps", icon: History, label: "紀錄" },
        ]
      : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
      <div className="max-w-screen-xl mx-auto flex justify-around items-center h-20 px-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-6 py-3 rounded-lg transition-all min-h-[44px] min-w-[44px]",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default Navigation
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "refactor: update Navigation for browse/shelf/add/swaps"
```

---

### Task 8: Build MyShelf page

**Files:**
- Create: `src/pages/MyShelf.tsx`

- [ ] **Step 1: Create MyShelf.tsx**

```tsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import BookCard from "@/components/BookCard"
import { BookCardSkeleton } from "@/components/ui/skeleton-loader"
import { Plus, BookOpen, Trash2, Edit } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { useProfile } from "@/hooks/use-profile"
import type { Book } from "@/integrations/supabase/types"

const MyShelf = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isReady, login } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      login()
      return
    }
    if (profile) fetchMyBooks()
  }, [profile, isReady, isAuthenticated])

  const fetchMyBooks = async () => {
    if (!profile) return
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("owner_id", profile.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setBooks(data || [])
    } catch (error) {
      toast.error("無法載入書籍")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這本書嗎？")) return
    try {
      const { error } = await supabase.from("books").delete().eq("id", id)
      if (error) throw error
      setBooks(books.filter((b) => b.id !== id))
      toast.success("已刪除")
    } catch (error) {
      toast.error("刪除失敗")
    }
  }

  if (!isReady || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-16">
            {[1, 2, 3].map((i) => <BookCardSkeleton key={i} />)}
          </div>
        </div>
        <Navigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">我的書架</h1>
            <Button onClick={() => navigate("/my/add")}>
              <Plus className="h-4 w-4 mr-2" />
              上架新書
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <BookCardSkeleton key={i} />)}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-16 space-y-6">
            <BookOpen className="h-20 w-20 mx-auto text-muted-foreground/50" />
            <p className="text-xl font-medium text-muted-foreground">還沒有上架任何書</p>
            <Button onClick={() => navigate("/my/add")} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              上架第一本書
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                actions={
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/my/edit/${book.id}`)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      編輯
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(book.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      刪除
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </main>

      <Navigation />
    </div>
  )
}

export default MyShelf
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add MyShelf page with book management"
```

---

### Task 9: Rebuild AddBook for swap context

**Files:**
- Modify: `src/pages/AddBook.tsx`

- [ ] **Step 1: Replace AddBook.tsx**

Remove rating, progress, initialNote, notes creation. Add status field. Use profile instead of Supabase auth.

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "refactor: rebuild AddBook for book-swap (no notes/rating)"
```

---

### Task 10: Build UserShelf page

**Files:**
- Create: `src/pages/UserShelf.tsx`

- [ ] **Step 1: Create UserShelf.tsx**

```tsx
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import BookCard from "@/components/BookCard"
import { BookCardSkeleton } from "@/components/ui/skeleton-loader"
import { ArrowLeft, BookOpen, User } from "lucide-react"
import type { Profile, Book } from "@/integrations/supabase/types"

const UserShelf = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserData()
  }, [id])

  const fetchUserData = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      const { data: booksData, error: booksError } = await supabase
        .from("books")
        .select("*")
        .eq("owner_id", id)
        .order("created_at", { ascending: false })

      if (booksError) throw booksError
      setBooks(booksData || [])
    } catch (error) {
      console.error("Failed to load user:", error)
    } finally {
      setLoading(false)
    }
  }

  const availableBooks = books.filter((b) => b.status === "available")
  const swappedBooks = books.filter((b) => b.status === "swapped")

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
          {profile && (
            <div className="flex items-center gap-3">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name} className="w-10 h-10 rounded-full" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold">{profile.name} 的書架</h1>
                <p className="text-sm text-muted-foreground">
                  {availableBooks.length} 本可換 · {swappedBooks.length} 本已換出
                </p>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <BookCardSkeleton key={i} />)}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-20 w-20 mx-auto text-muted-foreground/50" />
            <p className="text-xl font-medium text-muted-foreground mt-4">這個人還沒上架任何書</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </main>

      <Navigation />
    </div>
  )
}

export default UserShelf
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add public UserShelf page"
```

---

### Task 11: Build SwapHistory page

**Files:**
- Create: `src/pages/SwapHistory.tsx`

- [ ] **Step 1: Create SwapHistory.tsx**

```tsx
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/Navigation"
import { ArrowLeft, ArrowRight, History } from "lucide-react"
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
  const navigate = useNavigate()
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
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add SwapHistory page"
```

---

### Task 12: Add Supabase migration for new schema

**Files:**
- Create: `supabase/migrations/20260501_happybook_schema.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Drop old tables
DROP TABLE IF EXISTS note_images CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS books CASCADE;

-- Drop old enums
DROP TYPE IF EXISTS note_section;
DROP TYPE IF EXISTS reading_status;

-- Profiles (synced from LetMeUse)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letmeuse_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Books
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  cover_url TEXT,
  tags TEXT[],
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'swapped')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Swap records
CREATE TABLE swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES profiles(id),
  to_user_id UUID NOT NULL REFERENCES profiles(id),
  note TEXT,
  swapped_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_books_owner ON books(owner_id);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_swaps_from ON swaps(from_user_id);
CREATE INDEX idx_swaps_to ON swaps(to_user_id);

-- Disable RLS (public reads, client-side auth checks)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE swaps ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public read books" ON books FOR SELECT USING (true);
CREATE POLICY "Public read swaps" ON swaps FOR SELECT USING (true);

-- Public write (auth enforced client-side via LetMeUse)
CREATE POLICY "Public insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update profiles" ON profiles FOR UPDATE USING (true);
CREATE POLICY "Public insert books" ON books FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update books" ON books FOR UPDATE USING (true);
CREATE POLICY "Public delete books" ON books FOR DELETE USING (true);
CREATE POLICY "Public insert swaps" ON swaps FOR INSERT WITH CHECK (true);
```

- [ ] **Step 2: Remove old migration files**

```bash
rm supabase/migrations/20251015065424_e4c83bf0-04de-45db-a697-ae39e370956b.sql
rm supabase/migrations/20251015065439_b1f91222-1ad7-43c0-9c7e-0d7b94812d18.sql
rm supabase/migrations/20251021_add_image_support.sql
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Supabase migration for HappyBook schema"
```

---

### Task 13: Clean up package.json and update project metadata

**Files:**
- Modify: `package.json`
- Delete: `plan.md`, `TESTING_CHECKLIST.md`, `README.md`
- Create: `README.md`

- [ ] **Step 1: Update package.json name**

Change `"name": "vite_react_shadcn_ts"` to `"name": "happybook"`

- [ ] **Step 2: Delete old docs**

```bash
rm plan.md TESTING_CHECKLIST.md README.md
```

- [ ] **Step 3: Create new README.md**

```markdown
# HappyBook (換書不可)

Book swap community site. List your books, browse others, swap and record.

## Stack

React + Vite + TypeScript + shadcn/ui + Tailwind + Supabase + LetMeUse

## Dev

```bash
npm install
npm run dev
```

## Deploy

ZIP the `dist/` folder after `npm run build` and upload to pipee.tw.
```

- [ ] **Step 4: Commit and push**

```bash
git add -A && git commit -m "chore: update metadata, clean up old docs"
git push
```
