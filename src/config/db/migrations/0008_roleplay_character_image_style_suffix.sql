-- 0008_roleplay_character_image_style_suffix.sql
--
-- Adds the fixed visual-style anchor that powers P2-2 of the character
-- personality plan (see roleplay-character-personality-plan.md).
--
-- The AI Writer produces this short prompt suffix alongside the personality
-- card and we append it to every portrait/scene render so all of a
-- character's images share the same look (illustration style, palette,
-- lighting, framing). Without it each regen drifted because the diffusion
-- model anchored on whatever scene words happened to be in the request.
--
-- We store it as a plain text column (not JSON) because it's a single
-- prompt fragment, not a structured payload. Default '' keeps existing
-- characters compatible: when the suffix is empty the image route skips
-- the append step and behaves like before.

ALTER TABLE "roleplay_character"
  ADD COLUMN IF NOT EXISTS "image_style_suffix" text NOT NULL DEFAULT '';
