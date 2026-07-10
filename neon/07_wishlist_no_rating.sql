-- Wishlist games cannot have user ratings

UPDATE games
SET
  rating = NULL,
  rated_at = NULL
WHERE status = 'wishlist'
  AND (rating IS NOT NULL OR rated_at IS NOT NULL);

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_wishlist_no_rating;
ALTER TABLE games
  ADD CONSTRAINT games_wishlist_no_rating
  CHECK (status <> 'wishlist'::game_play_status OR rating IS NULL);

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_wishlist_no_rated_at;
ALTER TABLE games
  ADD CONSTRAINT games_wishlist_no_rated_at
  CHECK (status <> 'wishlist'::game_play_status OR rated_at IS NULL);

NOTIFY pgrst, 'reload schema';
