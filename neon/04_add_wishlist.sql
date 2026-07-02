-- Wishlist status and release date for countdowns

ALTER TYPE game_play_status ADD VALUE IF NOT EXISTS 'wishlist';

ALTER TABLE games ADD COLUMN IF NOT EXISTS release_date DATE;

CREATE INDEX IF NOT EXISTS idx_games_release_date ON games(release_date);

NOTIFY pgrst, 'reload schema';
