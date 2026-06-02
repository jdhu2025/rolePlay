CREATE TABLE IF NOT EXISTS "roleplay_character" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"name" text NOT NULL,
	"age" integer DEFAULT 25 NOT NULL,
	"gender" text DEFAULT 'non-binary' NOT NULL,
	"author_name" text DEFAULT 'you' NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"opening" text DEFAULT '' NOT NULL,
	"avatar_url" text DEFAULT '' NOT NULL,
	"cover_url" text DEFAULT '' NOT NULL,
	"tags" text DEFAULT '[]' NOT NULL,
	"style" text DEFAULT '' NOT NULL,
	"relationship" text DEFAULT '' NOT NULL,
	"scene" text DEFAULT '' NOT NULL,
	"personality" text DEFAULT '[]' NOT NULL,
	"voice" text DEFAULT '' NOT NULL,
	"settings" text DEFAULT '' NOT NULL,
	"visual_identity" text DEFAULT '{}' NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roleplay_conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"character_id" text,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"title" text DEFAULT '' NOT NULL,
	"provider" text DEFAULT 'openrouter' NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"character_snapshot" text DEFAULT '{}' NOT NULL,
	"memory_summary" text DEFAULT '' NOT NULL,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roleplay_message" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"media" text,
	"provider" text DEFAULT '' NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roleplay_memory" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"character_id" text,
	"conversation_id" text,
	"status" text DEFAULT 'created' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roleplay_asset" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"character_id" text,
	"conversation_id" text,
	"message_id" text,
	"status" text DEFAULT 'created' NOT NULL,
	"type" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"storage_key" text DEFAULT '' NOT NULL,
	"content_type" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"metadata" text
);
--> statement-breakpoint
ALTER TABLE "roleplay_character" ADD CONSTRAINT "roleplay_character_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "roleplay_conversation" ADD CONSTRAINT "roleplay_conversation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "roleplay_conversation" ADD CONSTRAINT "roleplay_conversation_character_id_roleplay_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."roleplay_character"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "roleplay_message" ADD CONSTRAINT "roleplay_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "roleplay_message" ADD CONSTRAINT "roleplay_message_conversation_id_roleplay_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."roleplay_conversation"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "roleplay_memory" ADD CONSTRAINT "roleplay_memory_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "roleplay_memory" ADD CONSTRAINT "roleplay_memory_character_id_roleplay_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."roleplay_character"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "roleplay_memory" ADD CONSTRAINT "roleplay_memory_conversation_id_roleplay_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."roleplay_conversation"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "roleplay_asset" ADD CONSTRAINT "roleplay_asset_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "roleplay_asset" ADD CONSTRAINT "roleplay_asset_character_id_roleplay_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."roleplay_character"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "roleplay_asset" ADD CONSTRAINT "roleplay_asset_conversation_id_roleplay_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."roleplay_conversation"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "roleplay_asset" ADD CONSTRAINT "roleplay_asset_message_id_roleplay_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."roleplay_message"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_character_user_status" ON "roleplay_character" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_character_visibility_status" ON "roleplay_character" USING btree ("visibility","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_conversation_user_status" ON "roleplay_conversation" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_conversation_character" ON "roleplay_conversation" USING btree ("character_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_message_conversation_status" ON "roleplay_message" USING btree ("conversation_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_message_user_status" ON "roleplay_message" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_memory_user_status" ON "roleplay_memory" USING btree ("user_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_memory_character" ON "roleplay_memory" USING btree ("character_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_memory_conversation" ON "roleplay_memory" USING btree ("conversation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_asset_user_type" ON "roleplay_asset" USING btree ("user_id","type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_asset_character" ON "roleplay_asset" USING btree ("character_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_asset_conversation" ON "roleplay_asset" USING btree ("conversation_id");
