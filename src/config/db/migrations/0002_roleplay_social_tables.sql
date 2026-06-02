CREATE TABLE IF NOT EXISTS "roleplay_character_follow" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"character_id" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roleplay_character_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"character_id" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"author_name" text DEFAULT '' NOT NULL,
	"metadata" text
);
--> statement-breakpoint
ALTER TABLE "roleplay_character_follow" ADD CONSTRAINT "roleplay_character_follow_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "roleplay_character_follow" ADD CONSTRAINT "roleplay_character_follow_character_id_roleplay_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."roleplay_character"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "roleplay_character_comment" ADD CONSTRAINT "roleplay_character_comment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "roleplay_character_comment" ADD CONSTRAINT "roleplay_character_comment_character_id_roleplay_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."roleplay_character"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_roleplay_follow_user_character" ON "roleplay_character_follow" USING btree ("user_id","character_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_follow_character_status" ON "roleplay_character_follow" USING btree ("character_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_comment_character_status" ON "roleplay_character_comment" USING btree ("character_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_comment_user_status" ON "roleplay_character_comment" USING btree ("user_id","status");
