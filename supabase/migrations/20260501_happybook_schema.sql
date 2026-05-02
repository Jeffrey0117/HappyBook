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
