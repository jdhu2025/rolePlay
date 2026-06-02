-- 0009_roleplay_character_voice_preset.sql
--
-- P2-3 of the character personality plan
-- (see roleplay-character-personality-plan.md). Adds the AI-Writer-produced
-- TTS voice recommendation that the editor surfaces and the future TTS
-- route consumes when rendering audio replies.
--
-- Stored as a short text id from a curated whitelist (see
-- VOICE_PRESET_IDS in src/shared/lib/roleplay-personality.ts) rather than a
-- raw Volcengine voice_type, so the upstream provider can change without a
-- DB migration. Empty default keeps existing characters compatible: when
-- the preset is empty the TTS route falls back to the gender-based default
-- it already uses.

ALTER TABLE "roleplay_character"
  ADD COLUMN IF NOT EXISTS "voice_preset" text NOT NULL DEFAULT '';
