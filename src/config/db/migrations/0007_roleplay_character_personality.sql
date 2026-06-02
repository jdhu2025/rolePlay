-- 0007_roleplay_character_personality.sql
--
-- Adds the structured "personality card" payload that powers the P0 wave of
-- character-writing improvements (see roleplay-character-personality-plan.md):
--   - negative_anchors: things the character will NOT do (reverse constraints
--     that bite harder than positive descriptions)
--   - catchphrases: 3-5 signature lines/words that anchor voice
--   - metaphor_domain: the imagery the character reaches for ("memory leaks",
--     "火候", etc.)
--   - identity / appearance / core_traits / speaking_style_notes / values /
--     relationship_hook: the 6-block structured settings template that lets
--     the chat pipeline split the system prompt into separate, model-friendly
--     messages instead of one big blob.
--
-- We store it as a single text column holding JSON to avoid bloating the
-- table with sparse columns and to leave room for future additions (style
-- few-shot examples in P1-2, relationship state vector in P2-1) without
-- further migrations. Default '{}' keeps the field optional so legacy rows
-- and seed scripts continue to work; the chat pipeline degrades gracefully
-- to the old "settings as one blob" path when this object is empty.

ALTER TABLE "roleplay_character"
  ADD COLUMN IF NOT EXISTS "personality_card" text NOT NULL DEFAULT '{}';
