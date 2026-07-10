-- Paused play status

ALTER TYPE game_play_status ADD VALUE IF NOT EXISTS 'paused';

NOTIFY pgrst, 'reload schema';
