-- 新增書籍封面欄位
ALTER TABLE public.books
ADD COLUMN cover_url TEXT;

-- 建立筆記圖片表
CREATE TABLE public.note_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 啟用 RLS
ALTER TABLE public.note_images ENABLE ROW LEVEL SECURITY;

-- Note Images RLS 政策（透過 notes 和 books 表檢查權限）
CREATE POLICY "Users can view images of their notes"
  ON public.note_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      JOIN public.books ON books.id = notes.book_id
      WHERE notes.id = note_images.note_id
      AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert images to their notes"
  ON public.note_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes
      JOIN public.books ON books.id = notes.book_id
      WHERE notes.id = note_images.note_id
      AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images of their notes"
  ON public.note_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      JOIN public.books ON books.id = notes.book_id
      WHERE notes.id = note_images.note_id
      AND books.user_id = auth.uid()
    )
  );

-- 建立 storage bucket (如果尚未存在)
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('note-images', 'note-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS 政策
CREATE POLICY "Users can upload their book covers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'book-covers' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view book covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

CREATE POLICY "Users can delete their book covers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'book-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their note images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'note-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view note images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'note-images');

CREATE POLICY "Users can delete their note images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'note-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );