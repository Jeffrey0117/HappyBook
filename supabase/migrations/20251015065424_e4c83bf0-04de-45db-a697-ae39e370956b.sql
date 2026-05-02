-- 建立閱讀狀態的 enum
CREATE TYPE reading_status AS ENUM ('未讀', '閱讀中', '已讀');

-- 建立筆記區域的 enum
CREATE TYPE note_section AS ENUM ('摘錄', '思考', '實踐');

-- 建立書籍表
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  progress reading_status DEFAULT '未讀',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 建立筆記表
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  section note_section NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 啟用 RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Books RLS 政策
CREATE POLICY "Users can view their own books"
  ON public.books FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own books"
  ON public.books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own books"
  ON public.books FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own books"
  ON public.books FOR DELETE
  USING (auth.uid() = user_id);

-- Notes RLS 政策（透過 books 表檢查權限）
CREATE POLICY "Users can view notes of their books"
  ON public.notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = notes.book_id
      AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert notes to their books"
  ON public.notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = notes.book_id
      AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update notes of their books"
  ON public.notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = notes.book_id
      AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete notes of their books"
  ON public.notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = notes.book_id
      AND books.user_id = auth.uid()
    )
  );

-- 建立更新時間戳記的函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為 books 和 notes 建立觸發器
CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();