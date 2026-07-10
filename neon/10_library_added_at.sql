-- Track when a wishlist game is moved into the library
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS library_added_at TIMESTAMPTZ;
