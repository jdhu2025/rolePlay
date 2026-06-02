-- 0013_roleplay_format_style.sql
--
-- P2-4: character-level reply formatting preferences. Stored as JSON text
-- to match the existing roleplay_character JSON-text columns.

ALTER TABLE "roleplay_character"
  ADD COLUMN IF NOT EXISTS "format_style" text NOT NULL DEFAULT '{"emojiFrequency":"rare","actionBeatLength":"balanced","englishMix":"none"}';
