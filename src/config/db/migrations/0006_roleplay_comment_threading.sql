-- Phase A3: roleplay_character_comment threading
-- Adds parent_id (NULL for top-level) and like_count to support
-- "View N Replies" two-level threading on the character chat page.

ALTER TABLE "roleplay_character_comment" ADD COLUMN IF NOT EXISTS "parent_id" text;
--> statement-breakpoint
ALTER TABLE "roleplay_character_comment" ADD COLUMN IF NOT EXISTS "like_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "roleplay_character_comment" ADD CONSTRAINT "roleplay_character_comment_parent_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."roleplay_character_comment"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_comment_parent" ON "roleplay_character_comment" USING btree ("parent_id");
