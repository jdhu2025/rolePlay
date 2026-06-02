-- 0010_user_persona.sql
--
-- P1-1 of the roleplay character personality plan.
-- Stores private user-side roleplay preferences so the chat pipeline can
-- address the user by their preferred name, respect the default relationship
-- stance, and adapt tone without asking every character to rediscover it.
--
-- JSON text shape:
--   {
--     "preferredName": string,
--     "defaultRelationship": string,
--     "tonePreference": string
--   }
--
-- Empty '{}' keeps existing users compatible and means "no extra persona
-- instruction".

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "persona" text NOT NULL DEFAULT '{}';
