-- 0011_roleplay_style_examples.sql
--
-- P1-2 of the roleplay character personality plan.
-- Stores 2-3 concise user/character few-shot pairs that demonstrate the
-- character's cadence, narration density, catchphrase usage, and emotional
-- response pattern. The chat pipeline injects these as nearby example turns
-- before the live user message so generation keeps the same voice.
--
-- JSON text shape:
--   [
--     { "user": string, "character": string },
--     ...
--   ]
--
-- Empty '[]' keeps old characters compatible.

ALTER TABLE "roleplay_character"
  ADD COLUMN IF NOT EXISTS "style_examples" text NOT NULL DEFAULT '[]';
