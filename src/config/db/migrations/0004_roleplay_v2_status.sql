-- Phase A1: roleplay_character v2 status + new columns
-- - Adds skills, chat_count, like_count, rejection_reason
-- - Backfills legacy status='created' rows to 'published' so existing
--   characters stay visible after we tighten the default filter to
--   status='published' in the listing endpoint.

ALTER TABLE "roleplay_character" ADD COLUMN IF NOT EXISTS "skills" text DEFAULT '[]' NOT NULL;
--> statement-breakpoint
ALTER TABLE "roleplay_character" ADD COLUMN IF NOT EXISTS "chat_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "roleplay_character" ADD COLUMN IF NOT EXISTS "like_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "roleplay_character" ADD COLUMN IF NOT EXISTS "rejection_reason" text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE "roleplay_character" SET "status" = 'published' WHERE "status" = 'created';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_character_status_visibility" ON "roleplay_character" USING btree ("status","visibility");
