-- Change books.status: replace 'swapped' with 'lent_out'
-- First update any existing 'swapped' rows
UPDATE books SET status = 'lent_out' WHERE status = 'swapped';

-- Drop old constraint and add new one
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_status_check;
ALTER TABLE books ADD CONSTRAINT books_status_check CHECK (status IN ('available', 'lent_out'));

-- Add swap status tracking columns
ALTER TABLE swaps ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned'));
ALTER TABLE swaps ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;

-- Add update policy for swaps (needed for marking returned)
CREATE POLICY "Public update swaps" ON swaps FOR UPDATE USING (true);

-- Index for active swaps lookup
CREATE INDEX IF NOT EXISTS idx_swaps_status ON swaps(status);
CREATE INDEX IF NOT EXISTS idx_swaps_book_active ON swaps(book_id, status) WHERE status = 'active';
