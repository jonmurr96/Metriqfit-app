-- Migration 042: Add exercise GIF animation support
-- Updates gif_url column to reference local exercise animation GIFs
-- Source: https://github.com/omercotkd/exercises-gifs (1323 exercise animations)

-- Add comment explaining the gif_url can reference local assets
COMMENT ON COLUMN public.exercises.gif_url IS 'URL or local path to exercise animation GIF (local: /assets/exercises/XXXX.gif, remote: https://...)';

-- Note: The gif_url field already exists in the exercises table
-- Local GIF files are stored in: assets/exercises/
-- Mapping is handled client-side via utils/exerciseGifMapper.ts
-- To update exercises with local GIF paths, use the application code or a data migration script
