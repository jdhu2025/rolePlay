-- 0012_roleplay_conversation_state.sql
--
-- P2-1 of the roleplay character personality plan.
-- Stores a lightweight relationship state vector for each conversation:
--   {
--     "intimacy": number,
--     "trust": number,
--     "currentMood": string,
--     "lastTopic": string,
--     "insideJokes": string[],
--     "turnCount": number
--   }
--
-- Chat reads this before generation and updates it after each successful
-- reply. Empty '{}' keeps older conversations compatible.

ALTER TABLE "roleplay_conversation"
  ADD COLUMN IF NOT EXISTS "state" text NOT NULL DEFAULT '{}';
