-- Game play status and play history

DO $$ BEGIN
  CREATE TYPE game_play_status AS ENUM ('not_started', 'playing', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE games ADD COLUMN IF NOT EXISTS status game_play_status NOT NULL DEFAULT 'not_started';
ALTER TABLE games ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE games ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE games ADD COLUMN IF NOT EXISTS last_played_at TIMESTAMPTZ;

UPDATE games
SET
  status = 'completed',
  completed_at = COALESCE(completed_at, updated_at)
WHERE completed = TRUE
  AND status = 'not_started';

CREATE TABLE IF NOT EXISTS play_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_play_sessions_game_id ON play_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_play_sessions_user_id ON play_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_play_sessions_started_at ON play_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

GRANT USAGE ON TYPE game_play_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON play_sessions TO authenticated;

-- After applying this migration, refresh the Neon Data API schema cache
-- (Console: Data API -> Refresh schema cache, or: npm run db:refresh-api-schema)
