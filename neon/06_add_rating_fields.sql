-- User rating metadata

ALTER TABLE games ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_games_user_rating
  ON games(user_id, rating DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_games_rated_at
  ON games(rated_at DESC NULLS LAST)
  WHERE rated_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';
