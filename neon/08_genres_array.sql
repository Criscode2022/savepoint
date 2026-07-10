-- Store multiple genres per game

ALTER TABLE games
  ALTER COLUMN genre TYPE TEXT[]
  USING CASE
    WHEN genre IS NULL OR TRIM(genre::TEXT) = '' THEN '{}'::TEXT[]
    ELSE ARRAY[TRIM(genre::TEXT)]::TEXT[]
  END;

ALTER TABLE games ALTER COLUMN genre SET DEFAULT '{}';
UPDATE games SET genre = '{}' WHERE genre IS NULL;
ALTER TABLE games ALTER COLUMN genre SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_games_genre_gin ON games USING GIN (genre);

NOTIFY pgrst, 'reload schema';
