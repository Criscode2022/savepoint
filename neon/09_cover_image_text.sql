-- Store uploaded cover images as base64 data URLs or external links

ALTER TABLE games
  ALTER COLUMN cover_image TYPE TEXT;

NOTIFY pgrst, 'reload schema';
