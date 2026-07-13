-- Freeform tags for personal collections and filtering
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_games_tags ON games USING GIN (tags);
